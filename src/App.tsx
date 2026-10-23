import React, { useEffect, useRef, useState } from 'react';
import { RagnarokWorld } from './game/three/world';
import { TitleScreen } from './game/components/TitleScreen';
import { GameHud } from './game/components/GameHud';
import { BattleModal } from './game/components/BattleModal';
import { StatsModal } from './game/components/StatsModal';
import { InventoryModal } from './game/components/InventoryModal';
import { CraftingModal } from './game/components/CraftingModal';
import { MarketModal } from './game/components/MarketModal';
import { GuildModal } from './game/components/GuildModal';
import { RankedArenaModal } from './game/components/RankedArenaModal';
import { SeasonalEventModal } from './game/components/SeasonalEventModal';
import { CloudSyncModal } from './game/components/CloudSyncModal';
import { AntiCheatAndPerfModal } from './game/components/AntiCheatAndPerfModal';
import { CharacterCreationModal } from './game/components/CharacterCreationModal';
import { DailyQuestsModal } from './game/components/DailyQuestsModal';
import { AudioSettingsModal } from './game/components/AudioSettingsModal';

import {
  INITIAL_PLAYER,
  INITIAL_MONSTERS,
  INITIAL_GUILD,
  INITIAL_MARKET_LISTINGS,
  INITIAL_SKILLS,
} from './game/constants';
import {
  PlayerProfile,
  Monster,
  HardwareMetrics,
  AntiCheatStatus,
  MarketListing,
  Item,
  JobClass,
} from './game/types';
import { CharacterAppearance, DEFAULT_APPEARANCE } from './game/characterCustomization';
import { OPEN_WORLD_NODES, GatheringNode, executeGathering } from './game/economy';
import {
  DailyQuest,
  generateDailyQuests,
  updateQuestProgress,
  claimQuestReward,
} from './game/quests';
import { verifyAntiCheatAction, generateSaveHash } from './game/rules';
import { sound } from './game/audio';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<RagnarokWorld | null>(null);

  // Game State Machine: 'title' | 'playing' | 'battle'
  const [gameState, setGameState] = useState<'title' | 'playing' | 'battle'>('title');

  // Player & Game State
  const [player, setPlayer] = useState<PlayerProfile>(INITIAL_PLAYER);
  const [characterAppearance, setCharacterAppearance] = useState<CharacterAppearance>(DEFAULT_APPEARANCE);
  const [monsters, setMonsters] = useState<Monster[]>(INITIAL_MONSTERS);
  const [activeBattleMonster, setActiveBattleMonster] = useState<Monster | null>(null);
  const [guild, setGuild] = useState(INITIAL_GUILD);
  const [marketListings, setMarketListings] = useState<MarketListing[]>(INITIAL_MARKET_LISTINGS);
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>(() => generateDailyQuests());
  const [hasClaimedDailyBonus, setHasClaimedDailyBonus] = useState(false);

  // Proximity interactables
  const [nearbyMonster, setNearbyMonster] = useState<Monster | null>(null);
  const [nearbyNode, setNearbyNode] = useState<GatheringNode | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    | null
    | 'quests'
    | 'stats'
    | 'inventory'
    | 'crafting'
    | 'market'
    | 'guild'
    | 'arena'
    | 'seasonal'
    | 'cloud'
    | 'anticheat'
    | 'creator'
    | 'audio'
  >(null);

  // Performance & Anti-cheat
  const [metrics, setMetrics] = useState<HardwareMetrics>({
    fps: 60,
    frameTimeMs: 16,
    drawCalls: 18,
    polyCount: 4200,
    memoryUsageMb: 52,
    tier: 'High',
  });

  const [antiCheat, setAntiCheat] = useState<AntiCheatStatus>({
    verified: true,
    lastActionTime: Date.now(),
    suspiciousActionCount: 0,
    statusText: 'All systems green · Server authoritative delta valid',
    integrityHash: generateSaveHash(INITIAL_PLAYER),
  });

  // Mirror game state machine to document.body
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Autostart URL support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
    }
  }, []);

  // Show transient notification banner
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Mount 3D Scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const world = new RagnarokWorld(
      canvasMountRef.current,
      player,
      monsters,
      {
        onInteractMonster: (m) => {
          setNearbyMonster(m);
        },
        onEnterZone: (zone) => {
          triggerNotification(`Entering zone: ${zone}`);
        },
        onMetricsUpdate: (m) => {
          setMetrics(m);
        },
      }
    );

    worldRef.current = world;

    // Movement Key Listeners for PC
    const keysHeld = new Set<string>();
    const updateMove = () => {
      let dx = 0;
      let dz = 0;
      if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) dz -= 1;
      if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) dz += 1;
      if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) dx -= 1;
      if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) dx += 1;

      if (worldRef.current) {
        worldRef.current.moveIntent = { x: dx, z: dz };
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
        keysHeld.add(e.code);
        updateMove();
      }
      if (e.code === 'KeyE') {
        // Interact action key
        if (nearbyMonster) {
          handleEngageMonster(nearbyMonster);
        } else if (nearbyNode) {
          handleGatherNode(nearbyNode);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keysHeld.has(e.code)) {
        keysHeld.delete(e.code);
        updateMove();
      }
    };

    const handleBlur = () => {
      keysHeld.clear();
      if (worldRef.current) {
        worldRef.current.moveIntent = { x: 0, z: 0 };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      world.dispose();
      worldRef.current = null;
    };
  }, []);

  // Periodic proximity check for monsters and gathering nodes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!worldRef.current || gameState !== 'playing') return;

      const playerPos = worldRef.current.playerGroup.position;

      // Check nearest monster
      let closestM: Monster | null = null;
      let minMDist = 6.0; // 6 meters interact radius
      monsters.forEach((m) => {
        // Approximate field positions
        const mPos =
          m.id === 'poring' ? { x: -5, z: 32 } :
          m.id === 'fabre' ? { x: 6, z: 36 } :
          m.id === 'lunatic' ? { x: -12, z: 42 } :
          m.id === 'chonchon' ? { x: 10, z: 46 } : { x: 0, z: 58 };

        const dist = Math.hypot(playerPos.x - mPos.x, playerPos.z - mPos.z);
        if (dist < minMDist) {
          minMDist = dist;
          closestM = m;
        }
      });
      setNearbyMonster(closestM);

      // Check nearest gathering node
      let closestNode: GatheringNode | null = null;
      let minNodeDist = 7.0;
      OPEN_WORLD_NODES.forEach((n) => {
        const dist = Math.hypot(playerPos.x - n.position.x, playerPos.z - n.position.z);
        if (dist < minNodeDist) {
          minNodeDist = dist;
          closestNode = n;
        }
      });
      setNearbyNode(closestNode);
    }, 400);

    return () => clearInterval(interval);
  }, [gameState, monsters]);

  // Handle Engage Monster in Battle
  const handleEngageMonster = (monster: Monster) => {
    const now = Date.now();
    const ac = verifyAntiCheatAction(antiCheat.lastActionTime, now, 100);
    if (!ac.valid) {
      triggerNotification(`[Aegis Guard]: Suspicious action rate throttled.`);
      return;
    }
    setAntiCheat((prev) => ({ ...prev, lastActionTime: now }));

    sound.playClick();
    setActiveBattleMonster(monster);
    setGameState('battle');
    setNearbyMonster(null);
  };

  // Handle Gathering from Node
  const handleGatherNode = (node: GatheringNode) => {
    sound.playPoringBounce();
    const result = executeGathering(node, player.stats.luk);

    if (result.success && result.gatheredItems.length > 0) {
      sound.playLevelUp();
      const updatedPlayer: PlayerProfile = {
        ...player,
        inventory: [...player.inventory, ...result.gatheredItems],
        baseExp: player.baseExp + 10,
      };
      setPlayer(updatedPlayer);
      triggerNotification(`🌿 Harvested ${result.gatheredItems.map((i) => `${i.name} (x${i.quantity ?? 1})`).join(', ')}!`);

      // Update Daily Quest Progress (Gathering)
      const { quests, newlyCompleted } = updateQuestProgress(dailyQuests, 'gather', node.type, 1);
      setDailyQuests(quests);
      if (newlyCompleted.length > 0) {
        setTimeout(() => {
          sound.playLevelUp();
          triggerNotification(`📜 Daily Quest Complete: ${newlyCompleted[0].title}! Ready to claim.`);
        }, 1200);
      }
    } else {
      triggerNotification(result.message);
    }
  };

  // Title Screen Start
  const handleStartGame = () => {
    setGameState('playing');
  };

  // Select Job Class
  const handleSelectJob = (job: JobClass) => {
    setPlayer((prev) => ({
      ...prev,
      job,
      skills: INITIAL_SKILLS.filter((s) => s.job === job),
    }));
  };

  // Character Customization Save
  const handleSaveAppearance = (name: string, appearance: CharacterAppearance) => {
    setPlayer((prev) => ({
      ...prev,
      name,
    }));
    setCharacterAppearance(appearance);
    triggerNotification(`✨ Hero Avatar customized: ${name} (${appearance.race})!`);
  };

  // Battle Victory Callback
  const handleBattleVictory = (
    updatedPlayer: PlayerProfile,
    lootDrops: Item[],
    zenyGained: number,
    expGained: number
  ) => {
    setPlayer(updatedPlayer);
    setGameState('playing');
    const monsterFought = activeBattleMonster;
    setActiveBattleMonster(null);
    triggerNotification(
      `🏆 Victory! Gained +${expGained} EXP, +${zenyGained} Zeny, and ${lootDrops.length} items!`
    );

    // Update Daily Quest Progress (Hunting)
    if (monsterFought) {
      const { quests, newlyCompleted } = updateQuestProgress(dailyQuests, 'hunt', monsterFought.id, 1);
      setDailyQuests(quests);
      if (newlyCompleted.length > 0) {
        setTimeout(() => {
          sound.playLevelUp();
          triggerNotification(`📜 Daily Quest Complete: ${newlyCompleted[0].title}! Ready to claim.`);
        }, 1200);
      }
    }
  };

  // Claim Daily Quest Reward
  const handleClaimQuest = (questId: string) => {
    const res = claimQuestReward(questId, dailyQuests, player);
    setDailyQuests(res.updatedQuests);
    setPlayer(res.updatedPlayer);
    if (res.claimedQuest) {
      triggerNotification(
        `🎁 Claimed ${res.claimedQuest.title}: +${res.claimedQuest.zenyReward.toLocaleString()} Zeny & +${res.claimedQuest.expReward} EXP!`
      );
    }
  };

  // Claim Daily Completion Grand Bonus
  const handleClaimDailyBonus = () => {
    sound.playLevelUp();
    setHasClaimedDailyBonus(true);
    setPlayer((p) => ({
      ...p,
      zeny: p.zeny + 10000,
      baseExp: p.baseExp + 2000,
    }));
    triggerNotification('🎉 Daily Grand Chest Claimed! +10,000 Zeny & +2,000 EXP bonus added!');
  };

  // Battle Defeat Callback
  const handleBattleDefeat = () => {
    sound.playHit();
    setGameState('playing');
    setActiveBattleMonster(null);
    triggerNotification('💀 You collapsed in battle. Kafra Services revived you at Prontera Fountain.');
    if (worldRef.current) {
      worldRef.current.setPlayerPosition(0, 8);
    }
  };

  // Battle Flee Callback
  const handleBattleFlee = () => {
    sound.playClick();
    setGameState('playing');
    setActiveBattleMonster(null);
    triggerNotification('🏃 You successfully fled to safety!');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="threejs-canvas-container"
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Screen 1: Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          selectedJob={player.job}
          onSelectJob={handleSelectJob}
          onStartGame={handleStartGame}
          onOpenAudio={() => setActiveModal('audio')}
        />
      )}

      {/* Screen 2: Playing State HUD */}
      {gameState === 'playing' && (
        <GameHud
          player={player}
          metrics={metrics}
          dailyQuests={dailyQuests}
          nearbyMonster={nearbyMonster}
          nearbyNode={nearbyNode}
          onOpenQuests={() => setActiveModal('quests')}
          onOpenStats={() => setActiveModal('stats')}
          onOpenInventory={() => setActiveModal('inventory')}
          onOpenCrafting={() => setActiveModal('crafting')}
          onOpenMarket={() => setActiveModal('market')}
          onOpenGuild={() => setActiveModal('guild')}
          onOpenArena={() => setActiveModal('arena')}
          onOpenSeasonal={() => setActiveModal('seasonal')}
          onOpenCloudSync={() => setActiveModal('cloud')}
          onOpenAntiCheat={() => setActiveModal('anticheat')}
          onOpenCharacterCreator={() => setActiveModal('creator')}
          onOpenAudio={() => setActiveModal('audio')}
          onEngageMonster={handleEngageMonster}
          onGatherNode={handleGatherNode}
          onMoveIntent={(x, z) => {
            if (worldRef.current) {
              worldRef.current.moveIntent = { x, z };
            }
          }}
        />
      )}

      {/* Screen 3: Turn-Based Tactical Combat Modal */}
      {gameState === 'battle' && activeBattleMonster && (
        <BattleModal
          player={player}
          monster={activeBattleMonster}
          onVictory={handleBattleVictory}
          onDefeat={handleBattleDefeat}
          onFlee={handleBattleFlee}
        />
      )}

      {/* Daily Quests Modal */}
      {activeModal === 'quests' && (
        <DailyQuestsModal
          quests={dailyQuests}
          player={player}
          hasClaimedDailyBonus={hasClaimedDailyBonus}
          onClaimQuest={handleClaimQuest}
          onClaimDailyBonus={handleClaimDailyBonus}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Active Feature Modals */}
      {activeModal === 'creator' && (
        <CharacterCreationModal
          player={player}
          initialAppearance={characterAppearance}
          onSave={handleSaveAppearance}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'stats' && (
        <StatsModal
          player={player}
          onUpdatePlayer={(up) => {
            setPlayer(up);
            triggerNotification('Status points updated!');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'inventory' && (
        <InventoryModal
          player={player}
          onUpdatePlayer={(up) => {
            setPlayer(up);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'crafting' && (
        <CraftingModal
          player={player}
          onUpdatePlayer={(up) => {
            setPlayer(up);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'market' && (
        <MarketModal
          player={player}
          listings={marketListings}
          onBuyItem={(listing, updatedPlayer) => {
            setPlayer(updatedPlayer);
            setMarketListings((prev) =>
              prev.map((l) => (l.id === listing.id ? { ...l, sold: true } : l))
            );
          }}
          onCreateListing={(item, price, shopName) => {
            const newListing: MarketListing = {
              id: `mkt-custom-${Date.now()}`,
              sellerId: player.id,
              sellerName: player.name,
              sellerShopName: shopName,
              item,
              price,
              listedAt: Date.now(),
              sold: false,
            };
            setMarketListings((prev) => [newListing, ...prev]);
            // Remove item from inventory
            setPlayer((p) => ({
              ...p,
              inventory: p.inventory.filter((i) => i.id !== item.id),
            }));
            triggerNotification(`🛒 Listed ${item.name} on the marketplace!`);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'guild' && (
        <GuildModal
          guild={guild}
          player={player}
          onLaunchRaid={(boss) => {
            handleEngageMonster(boss);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'arena' && (
        <RankedArenaModal
          player={player}
          onStartDuel={(duelist) => {
            handleEngageMonster(duelist);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'seasonal' && (
        <SeasonalEventModal
          player={player}
          onClaimReward={(rew) => {
            setPlayer((p) => ({
              ...p,
              inventory: [...p.inventory, rew],
            }));
            triggerNotification(`🎉 Claimed event reward: ${rew.name}!`);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'cloud' && (
        <CloudSyncModal
          player={player}
          onImportProfile={(imported) => {
            setPlayer(imported);
            triggerNotification(`Restored profile for ${imported.name}!`);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'anticheat' && (
        <AntiCheatAndPerfModal
          metrics={metrics}
          antiCheat={antiCheat}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'audio' && (
        <AudioSettingsModal
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Toast Notification Banner */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-slate-950/95 border border-amber-500/60 shadow-2xl text-xs font-bold text-amber-300 pointer-events-none transition-all"
        >
          {notification}
        </div>
      )}
    </div>
  );
}
