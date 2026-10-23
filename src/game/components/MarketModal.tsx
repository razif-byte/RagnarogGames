import React, { useState } from 'react';
import { PlayerProfile, MarketListing, Item } from '../types';
import { executeMarketTrade } from '../rules';
import { sound } from '../audio';

interface MarketModalProps {
  player: PlayerProfile;
  listings: MarketListing[];
  onBuyItem: (listing: MarketListing, updatedPlayer: PlayerProfile) => void;
  onCreateListing: (item: Item, price: number, shopName: string) => void;
  onClose: () => void;
}

export const MarketModal: React.FC<MarketModalProps> = ({
  player,
  listings,
  onBuyItem,
  onCreateListing,
  onClose,
}) => {
  const [tab, setTab] = useState<'browse' | 'vending' | 'history'>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);

  // Vending creation state
  const [selectedSellItem, setSelectedSellItem] = useState<Item | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(1000);
  const [shopTitle, setShopTitle] = useState<string>(`${player.name}'s Vending Cart`);

  const filteredListings = listings.filter((l) => {
    if (l.sold) return false;
    if (categoryFilter !== 'all' && l.item.type !== categoryFilter) return false;
    if (searchTerm && !l.item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handlePurchase = (listing: MarketListing) => {
    sound.playClick();
    const tradeResult = executeMarketTrade(player.zeny, 0, listing.price, 2);

    if (!tradeResult.success) {
      setTradeMessage(`❌ Trade Failed: ${tradeResult.error}`);
      return;
    }

    sound.playLevelUp();
    const updatedPlayer: PlayerProfile = {
      ...player,
      zeny: tradeResult.newBuyerZeny,
      inventory: [...player.inventory, listing.item],
    };

    setTradeMessage(`✅ Successfully purchased ${listing.item.name} for ${listing.price.toLocaleString()} Zeny! (2% tax deducted)`);
    onBuyItem(listing, updatedPlayer);
    setSelectedListing(null);
  };

  const handleCreateVending = () => {
    if (!selectedSellItem) return;
    if (sellPrice <= 0) {
      setTradeMessage('❌ Price must be greater than 0 Zeny.');
      return;
    }

    sound.playLevelUp();
    onCreateListing(selectedSellItem, sellPrice, shopTitle);
    setTradeMessage(`🛒 Your vending cart "${shopTitle}" has listed ${selectedSellItem.name} for ${sellPrice.toLocaleString()} Zeny!`);
    setSelectedSellItem(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="market-modal"
    >
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase tracking-wider text-amber-400">
              Prontera Trading Post & Vending Street
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
              setTab('browse');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'browse' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Marketplace Listings ({filteredListings.length})
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('vending');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'vending' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Setup Vending Cart 🛒
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('history');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'history' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Economic Trends 📈
          </button>
        </div>

        {/* Trade message banner */}
        {tradeMessage && (
          <div className="px-6 py-2 bg-slate-950 border-b border-slate-800 text-xs font-semibold text-center text-amber-300">
            {tradeMessage}
          </div>
        )}

        {/* Tab 1: Browse Listings */}
        {tab === 'browse' && (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search items, cards, potions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-amber-400 focus:outline-none"
              />
              <div className="flex gap-1.5 overflow-x-auto">
                {['all', 'weapon', 'card', 'usable', 'material', 'headgear'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 text-[11px] rounded-lg font-bold capitalize transition-colors ${
                      categoryFilter === cat ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-xs text-amber-300">{listing.item.name}</span>
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        {listing.price.toLocaleString()} Z
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Vendor: <span className="text-slate-300 font-semibold">{listing.sellerShopName}</span> ({listing.sellerName})
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {listing.item.description}
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 capitalize">
                      Type: {listing.item.type} {listing.item.quantity ? `(x${listing.item.quantity})` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={player.zeny < listing.price}
                      onClick={() => handlePurchase(listing)}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow transition-all"
                    >
                      Buy Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Vending Cart */}
        {tab === 'vending' && (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              🛒 Merchant Vending Cart: List your gathered minerals, forged blades, or rare monster cards for other players to buy!
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Item to Sell */}
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">Select Item from Inventory:</span>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {player.inventory.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSellItem(item)}
                      className={`p-2.5 rounded-xl border text-left flex justify-between items-center transition-all ${
                        selectedSellItem?.id === item.id
                          ? 'border-amber-400 bg-slate-800 text-amber-300 font-bold'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-xs">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.quantity ? `x${item.quantity}` : '1'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configure Price & Shop Title */}
              <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Vending Cart Signboard:
                  </label>
                  <input
                    type="text"
                    value={shopTitle}
                    onChange={(e) => setShopTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-amber-400 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Sale Price (Zeny):
                  </label>
                  <input
                    type="number"
                    min={10}
                    step={100}
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-amber-400 focus:outline-none font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Prontera market tax: 2% upon transaction completion.
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!selectedSellItem}
                  onClick={handleCreateVending}
                  className="mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider shadow transition-all"
                >
                  Deploy Vending Stall 🛒
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Economic Trends */}
        {tab === 'history' && (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Price Indices & Commodity Trends:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Pure Oridecon', price: '620 Z', trend: '+8.4%', up: true, volume: '1,420 units traded' },
                { name: 'Pure Elunium', price: '760 Z', trend: '+12.1%', up: true, volume: '980 units traded' },
                { name: 'White Potion', price: '175 Z', trend: '-2.3%', up: false, volume: '5,800 units traded' },
                { name: 'Poring Card', price: '2,450 Z', trend: '+5.0%', up: true, volume: '142 units traded' },
                { name: 'Four-Leaf Clover', price: '3,800 Z', trend: '+15.2%', up: true, volume: '88 units traded' },
                { name: 'Iron Ore', price: '45 Z', trend: '-1.1%', up: false, volume: '12,400 units traded' },
              ].map((item) => (
                <div key={item.name} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-200">{item.name}</span>
                    <span className={`text-xs font-bold font-mono ${item.up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.trend}
                    </span>
                  </div>
                  <div className="text-sm font-black font-mono text-amber-300 mt-1">{item.price}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.volume}</div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              📊 Market Intelligence: Ore and refine material prices are surging due to upcoming Guild War (WoE) preparations. Harvesting White Herbs and Mining Veins yields strong profit margins.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
