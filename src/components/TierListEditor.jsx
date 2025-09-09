import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Fighting game characters data
const FIGHTING_GAME_CHARACTERS = {
  'Street Fighter 6': [
    { id: 'ryu', name: 'Ryu', image: '/images/characters/ryu.png' },
    { id: 'chunli', name: 'Chun-Li', image: '/images/characters/chunli.png' },
    { id: 'luke', name: 'Luke', image: '/images/characters/luke.png' },
    { id: 'jamie', name: 'Jamie', image: '/images/characters/jamie.png' },
    { id: 'manon', name: 'Manon', image: '/images/characters/manon.png' },
    { id: 'deejay', name: 'Dee Jay', image: '/images/characters/deejay.png' },
    { id: 'jp', name: 'JP', image: '/images/characters/jp.png' },
    { id: 'marisa', name: 'Marisa', image: '/images/characters/marisa.png' },
  ],
  'Tekken 8': [
    { id: 'jin', name: 'Jin Kazama', image: '/images/characters/jin.png' },
    { id: 'kazuya', name: 'Kazuya Mishima', image: '/images/characters/kazuya.png' },
    { id: 'nina', name: 'Nina Williams', image: '/images/characters/nina.png' },
    { id: 'paul', name: 'Paul Phoenix', image: '/images/characters/paul.png' },
    { id: 'law', name: 'Marshall Law', image: '/images/characters/law.png' },
    { id: 'xiaoyu', name: 'Ling Xiaoyu', image: '/images/characters/xiaoyu.png' },
  ],
  'Guilty Gear Strive': [
    { id: 'sol', name: 'Sol Badguy', image: '/images/characters/sol.png' },
    { id: 'ky', name: 'Ky Kiske', image: '/images/characters/ky.png' },
    { id: 'may', name: 'May', image: '/images/characters/may.png' },
    { id: 'axl', name: 'Axl Low', image: '/images/characters/axl.png' },
    { id: 'chipp', name: 'Chipp Zanuff', image: '/images/characters/chipp.png' },
    { id: 'potemkin', name: 'Potemkin', image: '/images/characters/potemkin.png' },
  ]
};

// Default tier configuration
const DEFAULT_TIERS = [
  { id: 's', name: 'S', color: '#ff4444', description: 'Top Tier' },
  { id: 'a', name: 'A', color: '#ff8844', description: 'High Tier' },
  { id: 'b', name: 'B', color: '#ffcc44', description: 'Mid Tier' },
  { id: 'c', name: 'C', color: '#88cc44', description: 'Low Tier' },
  { id: 'd', name: 'D', color: '#4488cc', description: 'Bottom Tier' },
];

const SortableItem = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const CharacterCard = ({ character, onRemove }) => {
  return (
    <div className="relative group bg-white rounded-lg shadow-md p-2 cursor-move hover:shadow-lg transition-all">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        ×
      </button>
      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mb-2">
        {character.image ? (
          <img src={character.image} alt={character.name} className="w-full h-full object-cover rounded" />
        ) : (
          <span className="text-gray-500 text-xs">{character.name.charAt(0)}</span>
        )}
      </div>
      <p className="text-xs text-center font-medium text-gray-700">{character.name}</p>
    </div>
  );
};

const DroppableTier = ({ tier, children, onDrop }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `tier-${tier.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-24 p-4 bg-gray-50 border-2 border-dashed transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
      }`}
    >
      {children}
    </div>
  );
};

const DroppablePool = ({ children, onDrop }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'character-pool',
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-32 p-4 bg-gray-100 border-2 border-dashed rounded-lg transition-colors ${
        isOver ? 'border-green-400 bg-green-50' : 'border-gray-300'
      }`}
    >
      {children}
    </div>
  );
};

export default function TierListEditor() {
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [characters, setCharacters] = useState(FIGHTING_GAME_CHARACTERS['Street Fighter 6']);
  const [tierCharacters, setTierCharacters] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [selectedGame, setSelectedGame] = useState('Street Fighter 6');
  const [tierName, setTierName] = useState('');
  const [tierDescription, setTierDescription] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Check if dropped on a tier
    if (overId.startsWith('tier-')) {
      const tierId = overId.replace('tier-', '');
      
      // Check if character is from the character pool
      const character = characters.find(c => c.id === activeId);
      if (character) {
        // Move from pool to tier
        setCharacters(prev => prev.filter(c => c.id !== activeId));
        setTierCharacters(prev => ({
          ...prev,
          [tierId]: [...(prev[tierId] || []), character]
        }));
      } else {
        // Move between tiers
        const sourceTier = Object.keys(tierCharacters).find(tierId => 
          tierCharacters[tierId]?.some(c => c.id === activeId)
        );
        
        if (sourceTier && sourceTier !== tierId) {
          const characterToMove = tierCharacters[sourceTier].find(c => c.id === activeId);
          setTierCharacters(prev => ({
            ...prev,
            [sourceTier]: prev[sourceTier].filter(c => c.id !== activeId),
            [tierId]: [...(prev[tierId] || []), characterToMove]
          }));
        }
      }
    } else if (overId === 'character-pool') {
      // Move back to character pool
      const sourceTier = Object.keys(tierCharacters).find(tierId => 
        tierCharacters[tierId]?.some(c => c.id === activeId)
      );
      
      if (sourceTier) {
        const characterToMove = tierCharacters[sourceTier].find(c => c.id === activeId);
        setTierCharacters(prev => ({
          ...prev,
          [sourceTier]: prev[sourceTier].filter(c => c.id !== activeId)
        }));
        setCharacters(prev => [...prev, characterToMove]);
      }
    }

    setActiveId(null);
  };

  const addTier = () => {
    if (!tierName.trim()) return;
    
    const newTier = {
      id: `tier-${Date.now()}`,
      name: tierName,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      description: tierDescription
    };
    
    setTiers([...tiers, newTier]);
    setTierName('');
    setTierDescription('');
  };

  const removeTier = (tierId) => {
    // Move characters back to pool
    const charactersInTier = tierCharacters[tierId] || [];
    setCharacters(prev => [...prev, ...charactersInTier]);
    
    // Remove tier
    setTiers(tiers.filter(tier => tier.id !== tierId));
    
    // Clean up tierCharacters
    const newTierCharacters = { ...tierCharacters };
    delete newTierCharacters[tierId];
    setTierCharacters(newTierCharacters);
  };

  const updateTier = (tierId, updates) => {
    setTiers(tiers.map(tier => 
      tier.id === tierId ? { ...tier, ...updates } : tier
    ));
  };

  const removeCharacterFromTier = (tierId, characterId) => {
    const character = tierCharacters[tierId].find(c => c.id === characterId);
    setTierCharacters(prev => ({
      ...prev,
      [tierId]: prev[tierId].filter(c => c.id !== characterId)
    }));
    setCharacters(prev => [...prev, character]);
  };

  const exportAsJSON = () => {
    const data = {
      tiers,
      tierCharacters,
      metadata: {
        game: selectedGame,
        createdAt: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tierlist-${selectedGame.replace(/\s+/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.tiers) setTiers(data.tiers);
        if (data.tierCharacters) setTierCharacters(data.tierCharacters);
        if (data.metadata?.game) setSelectedGame(data.metadata.game);
      } catch (error) {
        alert('Import failed: Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const exportAsImage = async () => {
    setIsExporting(true);
    try {
      const tierListElement = document.querySelector('#tierlist-container');
      if (!tierListElement) {
        alert('Cannot find tier list container');
        return;
      }

      const canvas = await html2canvas(tierListElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement('a');
      link.download = `tierlist-${selectedGame.replace(/\s+/g, '-')}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Image export failed:', error);
      alert('Image export failed, please try again');
    } finally {
      setIsExporting(false);
    }
  };

  const resetTierList = () => {
    if (confirm('Are you sure you want to reset the entire tier list? All data will be lost.')) {
      setTierCharacters({});
      setCharacters(FIGHTING_GAME_CHARACTERS[selectedGame]);
      setTiers(DEFAULT_TIERS);
    }
  };

  const getTierStats = () => {
    const total = Object.values(tierCharacters).reduce((sum, chars) => sum + chars.length, 0);
    const remaining = characters.length;
    return { total, remaining };
  };

  const stats = getTierStats();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Fighting Game Character Tier List Maker</h1>
        <p className="text-gray-600">Drag and drop characters to different tiers to create your fighting game character rankings</p>
        <div className="mt-4 flex justify-center gap-6 text-sm text-gray-500">
          <span>Ranked: <strong className="text-green-600">{stats.total}</strong></span>
          <span>Remaining: <strong className="text-blue-600">{stats.remaining}</strong></span>
          <span>Total: <strong>{stats.total + stats.remaining}</strong></span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <select
              value={selectedGame}
              onChange={(e) => {
                setSelectedGame(e.target.value);
                setCharacters(FIGHTING_GAME_CHARACTERS[e.target.value]);
                setTierCharacters({});
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {Object.keys(FIGHTING_GAME_CHARACTERS).map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
            
            <button
              onClick={exportAsJSON}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <span>📄</span>
              Export JSON
            </button>
            
            <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer flex items-center gap-2">
              <span>📁</span>
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={importFromJSON}
                className="hidden"
              />
            </label>
            
            <button
              onClick={exportAsImage}
              disabled={isExporting}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isExporting ? '📸' : '🖼️'}</span>
              {isExporting ? 'Exporting...' : 'Export Image'}
            </button>
            
            <button
              onClick={resetTierList}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              Reset
            </button>
          </div>

          {/* Add New Tier */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Tier Name"
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Description (Optional)"
              value={tierDescription}
              onChange={(e) => setTierDescription(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addTier}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              Add Tier
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Main Tier List Area - For Image Export */}
        <div id="tierlist-container" className="space-y-4 mb-8">
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-white rounded-lg shadow-md overflow-hidden border">
              <div className="flex">
                {/* Tier Header */}
                <div 
                  className="w-32 p-4 flex flex-col items-center justify-center text-white"
                  style={{ backgroundColor: tier.color }}
                >
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  {tier.description && (
                    <p className="text-sm text-center opacity-90">{tier.description}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        const newName = prompt('New Tier Name:', tier.name);
                        if (newName && newName !== tier.name) {
                          updateTier(tier.id, { name: newName });
                        }
                      }}
                      className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded hover:bg-opacity-30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeTier(tier.id)}
                      className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded hover:bg-opacity-30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {/* Tier Content Area */}
                <DroppableTier tier={tier}>
                  <SortableContext 
                    items={tierCharacters[tier.id]?.map(c => c.id) || []}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex flex-wrap gap-3">
                      {tierCharacters[tier.id]?.map((character) => (
                        <SortableItem key={character.id} id={character.id}>
                          <CharacterCard
                            character={character}
                            onRemove={() => removeCharacterFromTier(tier.id, character.id)}
                          />
                        </SortableItem>
                      ))}
                      {(!tierCharacters[tier.id] || tierCharacters[tier.id].length === 0) && (
                        <div className="w-full text-center text-gray-400 py-8">
                          Drop characters here
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DroppableTier>
              </div>
            </div>
          ))}
        </div>

        {/* Character Pool */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Character Pool (Drag characters above to rank them)</h3>
          <DroppablePool>
            <SortableContext 
              items={characters.map(c => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap gap-3">
                {characters.map((character) => (
                  <SortableItem key={character.id} id={character.id}>
                    <CharacterCard
                      character={character}
                      onRemove={() => {}}
                    />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
            {characters.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>All characters have been ranked!</p>
              </div>
            )}
          </DroppablePool>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-white rounded-lg shadow-lg p-2 opacity-80 transform rotate-3">
              {(() => {
                const character = characters.find(c => c.id === activeId) ||
                  Object.values(tierCharacters).flat().find(c => c.id === activeId);
                return character ? (
                  <CharacterCard character={character} onRemove={() => {}} />
                ) : null;
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-3">How to Use</h3>
        <ul className="text-blue-700 space-y-2">
          <li>• Drag characters from the pool to different tiers to rank them</li>
          <li>• Move characters between tiers by dragging</li>
          <li>• Click the × button on character cards to move them back to the pool</li>
          <li>• Use "Add Tier" button to create new ranking tiers</li>
          <li>• Import/Export functions for sharing and saving</li>
          <li>• Reset button to clear all rankings and start over</li>
          <li>• Export Image function generates high-quality shareable images</li>
        </ul>
      </div>
    </div>
  );
}