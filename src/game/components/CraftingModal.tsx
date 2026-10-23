import React, { useState } from 'react';
import { PlayerProfile, Item } from '../types';
import { CRAFTING_RECIPES, CraftingRecipe, executeCrafting, OPEN_WORLD_NODES } from '../economy';
import { sound } from '../audio';

interface CraftingModalProps {
  player: PlayerProfile;
  onUpdatePlayer: (updated: PlayerProfile) => void;
  onClose: () => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({ player, onUpdatePlayer, onClose }) => {
  const [activeTab, setActiveTab] = useState<'crafting' | 'nodes'>('crafting');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'potion' | 'weapon' | 'armor' | 'material'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe>(CRAFTING_RECIPES[0]);
  const [craftMessage, setCraftMessage] = useState<{ text: string; success: boolean } | null>(null);

  const filteredRecipes = CRAFTING_RECIPES.filter((r) => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  });

  const handleCraft = () => {
    sound.playClick();
    const result = executeCrafting(selectedRecipe, player.inventory, player.zeny);

    if (result.success && result.createdItem) {
      sound.playLevelUp();
      setCraftMessage({
        text: `✨ Success! Crafted ${result.createdItem.name} (x${result.createdItem.quantity ?? 1})!`,
        success: true,
      });
      onUpdatePlayer({
        ...player,
        zeny: result.newZeny,
        inventory: result.updatedInventory,
      });
    } else {
      sound.playHit();
      setCraftMessage({
        text: result.error || 'Crafting attempt failed!',
        success: false,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="crafting-modal"
    >
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase tracking-wider text-amber-400">
              Alchemy & Blacksmith Workshop
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
              💰 {player.zeny.toLocaleString()} Zeny
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('crafting');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'crafting' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Formulas & Forging Recipes
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('nodes');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'nodes' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Resource Nodes Field Guide 🌿
          </button>
        </div>

        {/* Crafting Tab */}
        {activeTab === 'crafting' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto">
            {/* Left Recipe List (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {(['all', 'potion', 'weapon', 'armor', 'material'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg font-bold capitalize transition-colors ${
                      selectedCategory === cat ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedRecipe(recipe);
                      setCraftMessage(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedRecipe.id === recipe.id
                        ? 'border-amber-400 bg-slate-800 text-amber-300 font-bold shadow'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="text-xs">{recipe.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      Category: {recipe.category} · Req Lv {recipe.requiredLevel}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Recipe Details & Crafting Action (7 cols) */}
            <div className="md:col-span-7 flex flex-col gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800 justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-black text-sm text-amber-300">{selectedRecipe.name}</h3>
                    <p className="text-[11px] text-slate-400">{selectedRecipe.result.description}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    {Math.round(selectedRecipe.successRate * 100)}% Success
                  </span>
                </div>

                {/* Required Ingredients */}
                <div className="mt-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Required Materials:
                  </span>
                  <div className="flex flex-col gap-2">
                    {selectedRecipe.ingredients.map((ing) => {
                      const userHas = player.inventory.find(
                        (i) => i.name.toLowerCase() === ing.name.toLowerCase() || i.id === ing.itemId
                      );
                      const currentCount = userHas?.quantity ?? 0;
                      const hasEnough = currentCount >= ing.quantity;

                      return (
                        <div
                          key={ing.itemId}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                        >
                          <span className="font-bold text-slate-200">{ing.name}</span>
                          <span
                            className={`font-mono font-bold ${
                              hasEnough ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {currentCount} / {ing.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cost Info */}
                <div className="mt-4 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Crafting / Forging Fee:</span>
                  <span className="text-amber-400 font-bold">{selectedRecipe.zenyCost.toLocaleString()} Zeny</span>
                </div>
              </div>

              {/* Status Banner */}
              {craftMessage && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                    craftMessage.success
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {craftMessage.text}
                </div>
              )}

              {/* Craft Button */}
              <button
                type="button"
                onClick={handleCraft}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all"
              >
                Synthesize Item ✨
              </button>
            </div>
          </div>
        )}

        {/* Nodes Field Guide Tab */}
        {activeTab === 'nodes' && (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
              🌿 Gathering Points: Walk near glowing resource nodes in Prontera South Field and press [E] or tap the Gather button to harvest raw botanicals and rare ores.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OPEN_WORLD_NODES.map((node) => (
                <div key={node.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: node.color }} />
                    <span className="font-bold text-xs text-slate-200">{node.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Location: <span className="font-mono text-amber-300">prt_fild08 (X: {node.position.x}, Z: {node.position.z})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Yields: {node.yields.map((y) => y.name).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
