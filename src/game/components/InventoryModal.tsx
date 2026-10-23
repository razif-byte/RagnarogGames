import React, { useState } from 'react';
import { PlayerProfile, Item, EquipSlot } from '../types';
import { sound } from '../audio';

interface InventoryModalProps {
  player: PlayerProfile;
  onUpdatePlayer: (updated: PlayerProfile) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ player, onUpdatePlayer, onClose }) => {
  const [tab, setTab] = useState<'inventory' | 'equipment' | 'refine'>('inventory');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'weapon' | 'armor' | 'usable' | 'card' | 'material'>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Refine state
  const [refineTarget, setRefineTarget] = useState<Item | null>(null);
  const [refineMessage, setRefineMessage] = useState<string | null>(null);

  // Equip item
  const handleEquip = (item: Item) => {
    if (!item.equipSlot) return;
    sound.playClick();
    const currentEquipped = player.equipment[item.equipSlot];

    let newInventory = player.inventory.filter((i) => i.id !== item.id);
    if (currentEquipped) {
      newInventory.push(currentEquipped);
    }

    const updated: PlayerProfile = {
      ...player,
      equipment: {
        ...player.equipment,
        [item.equipSlot]: item,
      },
      inventory: newInventory,
    };
    onUpdatePlayer(updated);
    setSelectedItem(null);
  };

  // Unequip item
  const handleUnequip = (slot: EquipSlot) => {
    const item = player.equipment[slot];
    if (!item) return;
    sound.playClick();

    const newEquip = { ...player.equipment };
    delete newEquip[slot];

    const updated: PlayerProfile = {
      ...player,
      equipment: newEquip,
      inventory: [...player.inventory, item],
    };
    onUpdatePlayer(updated);
  };

  // Blacksmith Refine Item
  const handleRefine = () => {
    if (!refineTarget) return;

    const currentRefine = refineTarget.refineLevel ?? 0;
    if (currentRefine >= 10) {
      setRefineMessage('Maximum refine level (+10) already reached!');
      return;
    }

    const isWeapon = refineTarget.type === 'weapon';
    const requiredMatId = isWeapon ? 'mat-oridecon' : 'mat-elunium';
    const requiredMatName = isWeapon ? 'Oridecon' : 'Elunium';

    const matItem = player.inventory.find((i) => i.id === requiredMatId || i.name.toLowerCase().includes(requiredMatName.toLowerCase()));
    if (!matItem || (matItem.quantity ?? 1) <= 0) {
      setRefineMessage(`Missing required material: ${requiredMatName}!`);
      return;
    }

    const cost = (currentRefine + 1) * 800;
    if (player.zeny < cost) {
      setRefineMessage(`Not enough Zeny! Requires ${cost} Zeny.`);
      return;
    }

    // Success rate formula: +1 to +4 = 100%, +5 = 80%, +6 = 60%, +7 = 40%, +8+ = 20%
    const successRate = currentRefine < 4 ? 1.0 : Math.max(0.2, 1.0 - (currentRefine - 3) * 0.2);
    const roll = Math.random();

    sound.playCritical();

    // Consume material & zeny
    let newInventory = [...player.inventory];
    const matIndex = newInventory.findIndex((i) => i.id === matItem.id);
    if (matIndex >= 0) {
      const q = newInventory[matIndex].quantity ?? 1;
      if (q > 1) {
        newInventory[matIndex] = { ...newInventory[matIndex], quantity: q - 1 };
      } else {
        newInventory.splice(matIndex, 1);
      }
    }

    if (roll <= successRate) {
      // Success!
      sound.playLevelUp();
      const updatedItem: Item = {
        ...refineTarget,
        refineLevel: currentRefine + 1,
        name: `+${currentRefine + 1} ${refineTarget.name.replace(/^\+\d+\s*/, '')}`,
      };

      // Update in equipment or inventory
      const updatedEquip = { ...player.equipment };
      let updatedInInventory = false;
      Object.keys(updatedEquip).forEach((key) => {
        const slot = key as EquipSlot;
        if (updatedEquip[slot]?.id === refineTarget.id) {
          updatedEquip[slot] = updatedItem;
        }
      });

      newInventory = newInventory.map((i) => (i.id === refineTarget.id ? updatedItem : i));

      setRefineTarget(updatedItem);
      setRefineMessage(`✨ Clang! Refinement Succeeded! Item is now +${currentRefine + 1}!`);

      onUpdatePlayer({
        ...player,
        zeny: player.zeny - cost,
        equipment: updatedEquip,
        inventory: newInventory,
      });
    } else {
      // Failure
      sound.playHit();
      setRefineMessage(`💥 Clang! Refinement Failed! The metal cracked, but was saved.`);
      onUpdatePlayer({
        ...player,
        zeny: player.zeny - cost,
        inventory: newInventory,
      });
    }
  };

  const filteredItems = player.inventory.filter((item) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'weapon') return item.type === 'weapon';
    if (selectedCategory === 'armor') return item.type === 'armor' || item.type === 'headgear';
    if (selectedCategory === 'usable') return item.type === 'usable';
    if (selectedCategory === 'card') return item.type === 'card';
    if (selectedCategory === 'material') return item.type === 'material';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="inventory-modal"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase tracking-wider text-amber-400">
              Inventory & Equipment
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold">
              {player.zeny.toLocaleString()} Zeny
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-5">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('inventory');
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'inventory' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Inventory ({player.inventory.length})
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('equipment');
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'equipment' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Equipment Paperdoll
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('refine');
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'refine' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Blacksmith Refine 🔨
          </button>
        </div>

        {/* Tab 1: Inventory Grid */}
        {tab === 'inventory' && (
          <div className="p-5 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'weapon', 'armor', 'usable', 'card', 'material'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-lg font-bold capitalize transition-colors ${
                    selectedCategory === cat ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedItem(item);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-slate-800 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-slate-100">{item.name}</span>
                      {item.quantity && item.quantity > 1 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-semibold">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize mt-0.5">{item.type}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-1">{item.description}</div>
                  </div>
                );
              })}
            </div>

            {/* Selected Item Drawer */}
            {selectedItem && (
              <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-amber-300">{selectedItem.name}</div>
                  <div className="text-[11px] text-slate-300">{selectedItem.description}</div>
                </div>
                {selectedItem.equipSlot && (
                  <button
                    type="button"
                    onClick={() => handleEquip(selectedItem)}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase"
                  >
                    Equip
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Equipment Paperdoll */}
        {tab === 'equipment' && (
          <div className="p-5 grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
            {([
              { slot: 'headTop' as EquipSlot, label: 'Upper Headgear', icon: '👒' },
              { slot: 'weapon' as EquipSlot, label: 'Main Weapon', icon: '⚔️' },
              { slot: 'armor' as EquipSlot, label: 'Armor Suit', icon: '🛡️' },
              { slot: 'shield' as EquipSlot, label: 'Shield / Guard', icon: '🔰' },
              { slot: 'garment' as EquipSlot, label: 'Garment / Manteau', icon: '🧣' },
              { slot: 'footgear' as EquipSlot, label: 'Footgear / Boots', icon: '👢' },
              { slot: 'accessory1' as EquipSlot, label: 'Accessory 1', icon: '💍' },
              { slot: 'accessory2' as EquipSlot, label: 'Accessory 2', icon: '📿' },
            ]).map(({ slot, label, icon }) => {
              const equipped = player.equipment[slot];
              return (
                <div
                  key={slot}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{label}</div>
                      <div className="text-xs font-bold text-slate-200">
                        {equipped ? equipped.name : '<Empty>'}
                      </div>
                    </div>
                  </div>
                  {equipped && (
                    <button
                      type="button"
                      onClick={() => handleUnequip(slot)}
                      className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-red-300 font-bold"
                    >
                      Unequip
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Blacksmith Refinement */}
        {tab === 'refine' && (
          <div className="p-5 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              🔨 Prontera Blacksmith Anvil: Refine weapons with Oridecon and armors with Elunium to boost ATK, DEF, and stats!
            </div>

            {/* Select Refinable Item */}
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">Select Item to Refine:</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ...Object.values(player.equipment).filter(Boolean),
                  ...player.inventory.filter((i) => i.type === 'weapon' || i.type === 'armor'),
                ].map((item) => (
                  <button
                    key={item!.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setRefineTarget(item!);
                      setRefineMessage(null);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      refineTarget?.id === item!.id
                        ? 'border-amber-400 bg-slate-800 font-bold text-amber-300'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-xs">{item!.name}</div>
                    <div className="text-[10px] text-slate-400">Refine Lv: +{item!.refineLevel ?? 0}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Refinement Action Box */}
            {refineTarget && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-black text-amber-300">{refineTarget.name}</div>
                    <div className="text-xs text-slate-400">
                      Target: +{(refineTarget.refineLevel ?? 0) + 1}
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono">
                    <span className="text-slate-400">Fee: </span>
                    <span className="text-amber-400 font-bold">
                      {((refineTarget.refineLevel ?? 0) + 1) * 800} Zeny
                    </span>
                  </div>
                </div>

                {refineMessage && (
                  <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs font-semibold text-center text-amber-200">
                    {refineMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRefine}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all"
                >
                  Strike Anvil 🔨
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
