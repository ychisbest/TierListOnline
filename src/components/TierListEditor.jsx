import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const mockItems = [
  { id: "i1", name: "Alpha", img: "https://placehold.jp/150x150.png" },
  { id: "i2", name: "Bravo", img: "https://placehold.jp/150x150.png" },
  { id: "i3", name: "Charlie", img: "https://placehold.jp/150x150.png" },
  { id: "i4", name: "Delta", img: "https://placehold.jp/150x150.png" },
  { id: "i6", name: "Echo", img: "https://placehold.jp/150x150.png" },
  { id: "i7", name: "Echo", img: "https://placehold.jp/150x150.png" },
  { id: "i8", name: "Echo", img: "https://placehold.jp/150x150.png" },
  { id: "i9", name: "Echo", img: "https://placehold.jp/150x150.png" }
];

const mockTiers = [
  { id: "t1", name: "S", color: "#ef4444", items: ["i1", "i2"] },
  { id: "t2", name: "A", color: "#f59e0b", items: ["i3"] },
  { id: "t3", name: "B", color: "#3b82f6", items: [] }
];

function generateId(prefix = "id") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

// Sortable Item Component
function SortableItem({ item, onContextMenu }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => onContextMenu(e, "item", item.id)}
      className="relative w-20 flex-shrink-0 flex flex-col items-center gap-1 select-none cursor-grab transition-transform duration-200 ease-in-out"
      title={item.name}
    >
      <img
        className="w-20 h-20 rounded-md object-cover shadow-sm transition-opacity duration-200"
        src={item.img}
        alt={item.name}
      />
      <div className="absolute bottom-0 text-xs text-center w-full rounded-b-md truncate text-gray-100 py-1 bg-black/40">
        {item.name}
      </div>
    </div>
  );
}

// Sortable Tier Component
function SortableTier({ tier, items, onContextMenu, onDrop, onDragOver }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tier.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderColor: tier.color + "20"
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex flew-row rounded-lg overflow-hidden border shadow-sm transition-all duration-200 ease-in-out"

      onDragOver={(e) => onDragOver(e, tier.id)}
      onDrop={(e) => onDrop(e, tier.id)}
      onContextMenu={(e) => onContextMenu(e, "tier", tier.id)}
    >
      <div
        className="w-20 flex flex-col items-center justify-center p-3 text-sm font-semibold select-none cursor-context-menu"
        style={{ background: tier.color, color: "#fff" }}
        title="Right-click to edit tier"
      >
        <div className="text-white text-sm font-semibold">{tier.name}</div>
      </div>
      <div className="flex-1 bg-white dark:bg-gray-800 p-3 transition-all duration-200">
        <SortableContext items={tier.items} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-3 flex-row flex-wrap py-1 min-h-[88px]">
            {tier.items.length === 0 && (
              <div className="text-sm text-gray-300 dark:text-gray-400">
                Drop items here
              </div>
            )}
            {tier.items.map((itemId) => {
              const item = items.find((x) => x.id === itemId);
              if (!item) return null;
              return (
                <SortableItem
                  key={item.id}
                  item={item}
                  onContextMenu={onContextMenu}
                />
              );
            })}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function TierListEditor() {
  const [items, setItems] = useState(mockItems);
  const [tiers, setTiers] = useState(mockTiers);
  const [menu, setMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    target: null
  });
  const [modal, setModal] = useState({
    open: false,
    type: null,
    id: null,
    form: { name: "", color: "#9ca3af", img: "" }
  });
  const [activeId, setActiveId] = useState(null);
  const [fileInput, setFileInput] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTierOfItem = useCallback(
    (itemId) => tiers.find((t) => t.items.includes(itemId)) || null,
    [tiers]
  );

  const unassignedItems = useMemo(
    () => items.filter((it) => !findTierOfItem(it.id)),
    [items, findTierOfItem]
  );

  // Image upload handler
  const handleImageUpload = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Export functionality
  const exportToJSON = () => {
    const data = {
      tiers: tiers.map(tier => ({
        ...tier,
        items: tier.items.map(itemId => {
          const item = items.find(i => i.id === itemId);
          return item ? { ...item } : null;
        }).filter(Boolean)
      })),
      unassignedItems: unassignedItems,
      exportDate: new Date().toISOString()
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tierlist-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import functionality
  const importFromJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Process imported data
        const allItems = [];
        const newTiers = data.tiers.map(tier => {
          const tierItems = tier.items || [];
          allItems.push(...tierItems);
          return {
            id: tier.id || generateId("t"),
            name: tier.name,
            color: tier.color,
            items: tierItems.map(item => item.id)
          };
        });

        const importedUnassigned = data.unassignedItems || [];
        allItems.push(...importedUnassigned);

        setItems(allItems);
        setTiers(newTiers);
      } catch (error) {
        alert('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  };

  // Drag & Drop Handlers
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

    // Find which tier the item is currently in
    const currentTier = tiers.find(tier => tier.items.includes(activeId));
    const overTier = tiers.find(tier => tier.id === overId);

    if (overTier && currentTier?.id !== overTier.id) {
      // Move item between tiers
      setTiers(prev => prev.map(tier => {
        if (tier.id === currentTier?.id) {
          return { ...tier, items: tier.items.filter(id => id !== activeId) };
        }
        if (tier.id === overTier.id) {
          return { ...tier, items: [...tier.items, activeId] };
        }
        return tier;
      }));
    }

    setActiveId(null);
  };

  function removeItemFromTiers(itemId) {
    setTiers((prev) =>
      prev.map((t) => ({ ...t, items: t.items.filter((id) => id !== itemId) }))
    );
  }

  function openContextMenu(e, type, id) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ open: true, x: e.clientX, y: e.clientY, target: { type, id } });
  }

  function closeContextMenu() {
    setMenu((m) => (m.open ? { ...m, open: false } : m));
  }

  useEffect(() => {
    const onGlobal = (e) => {
      if (e.type === "keydown" && e.key === "Escape") {
        closeContextMenu();
        closeModal();
      } else if (e.type === "click") {
        closeContextMenu();
      }
    };
    window.addEventListener("click", onGlobal);
    window.addEventListener("keydown", onGlobal);
    return () => {
      window.removeEventListener("click", onGlobal);
      window.removeEventListener("keydown", onGlobal);
    };
  }, []);

  function openModalFor(target) {
    if (!target) return;
    if (target.type === "tier") {
      const t = tiers.find((x) => x.id === target.id);
      if (!t) return;
      setModal({
        open: true,
        type: "tier",
        id: t.id,
        form: { name: t.name, color: t.color, img: "" }
      });
    } else {
      const it = items.find((x) => x.id === target.id);
      if (!it) return;
      setModal({
        open: true,
        type: "item",
        id: it.id,
        form: { name: it.name, img: it.img, color: "#9ca3af" }
      });
    }
  }

  function closeModal() {
    setModal((m) => (m.open ? { ...m, open: false } : m));
  }

  function submitModal() {
    if (!modal.open) return;
    if (modal.type === "tier") {
      const { name, color } = modal.form;
      setTiers((prev) =>
        prev.map((t) => (t.id === modal.id ? { ...t, name, color } : t))
      );
    } else if (modal.type === "item") {
      const { name, img } = modal.form;
      setItems((prev) => prev.map((it) => (it.id === modal.id ? { ...it, name, img } : it)));
    }
    closeModal();
  }

  function onMenuEdit() {
    openModalFor(menu.target);
    closeContextMenu();
  }

  function onMenuDelete() {
    const target = menu.target;
    if (!target) return;
    if (target.type === "tier") {
      setTiers((prev) => prev.filter((t) => t.id !== target.id));
    } else {
      removeItemFromTiers(target.id);
      setItems((prev) => prev.filter((it) => it.id !== target.id));
    }
    closeContextMenu();
  }

  const activeItem = activeId ? items.find(item => item.id === activeId) : null;

  return (
    <div className="p-4 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        {/* Control Panel */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={exportToJSON}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Export JSON
          </button>
          <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={importFromJSON}
              className="hidden"
            />
          </label>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <main className="flex-1 space-y-3">
            {tiers.length === 0 && (
              <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center text-gray-600 dark:text-gray-300">
                No tiers yet. Right-click to add (暂不提供新增入口，可在外部创建数据)。
              </div>
            )}

            <SortableContext items={tiers.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <SortableTier
                    key={tier.id}
                    tier={tier}
                    items={items}
                    onContextMenu={openContextMenu}
                    onDrop={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  />
                ))}
              </div>
            </SortableContext>
          </main>

          <aside className="mt-10">
            <div className="min-h-[96px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md p-3 flex flex-wrap gap-3 overflow-auto bg-white/50 dark:bg-gray-700/60">
              <SortableContext items={unassignedItems.map(item => item.id)} strategy={horizontalListSortingStrategy}>
                {unassignedItems.map((it) => (
                  <SortableItem
                    key={it.id}
                    item={it}
                    onContextMenu={openContextMenu}
                  />
                ))}
              </SortableContext>
              <div className="w-20 flex-shrink-0 flex flex-col items-center gap-1 select-none">
                <button
                  type="button"
                  title="Add item"
                  onClick={() => {
                    const id = generateId("i");
                    const newItem = { id, name: "New Item", img: "https://placehold.jp/150x150.png" };
                    setItems((s) => [newItem, ...s]);
                    setModal({
                      open: true,
                      type: "item",
                      id,
                      form: { name: newItem.name, img: newItem.img, color: "#9ca3af" }
                    });
                  }}
                  className="w-20 h-20 cursor-pointer rounded-md border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                    <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </aside>

          <DragOverlay>
            {activeItem ? (
              <div className="relative w-20 flex-shrink-0 flex flex-col items-center gap-1 select-none cursor-grabbing">
                <img
                  className="w-20 h-20 rounded-md object-cover shadow-lg transition-opacity duration-200"
                  src={activeItem.img}
                  alt={activeItem.name}
                />
                <div className="absolute bottom-0 text-xs text-center w-full rounded-b-md truncate text-gray-100 py-1 bg-black/40">
                  {activeItem.name}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {menu.open && (
        <div
          className="fixed z-50 w-40 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 text-sm"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onMenuEdit}
          >
            Edit
          </button>
          <button
            className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            onClick={onMenuDelete}
          >
            Delete
          </button>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative z-10 w-full max-w-md rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold mb-3">
              {modal.type === "tier" ? "Edit Tier" : "Edit Item"}
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-600 dark:text-gray-300">Name</span>
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 outline-none"
                  value={modal.form.name}
                  onChange={(e) =>
                    setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && submitModal()}
                  autoFocus
                />
              </label>
              {modal.type === "tier" ? (
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Color</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-12 rounded border-0"
                      value={modal.form.color}
                      onChange={(e) =>
                        setModal((m) => ({ ...m, form: { ...m.form, color: e.target.value } }))
                      }
                    />
                    <input
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                      value={modal.form.color}
                      onChange={(e) =>
                        setModal((m) => ({ ...m, form: { ...m.form, color: e.target.value } }))
                      }
                    />
                  </div>
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Image URL</span>
                    <input
                      className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                      value={modal.form.img}
                      onChange={(e) =>
                        setModal((m) => ({ ...m, form: { ...m.form, img: e.target.value } }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && submitModal()}
                      placeholder="https://..."
                    />
                  </label>
                  <div className="block">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Or upload image:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          try {
                            const base64 = await handleImageUpload(file);
                            setModal((m) => ({ ...m, form: { ...m.form, img: base64 } }));
                          } catch (error) {
                            alert('Failed to upload image');
                          }
                        }
                      }}
                      className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:brightness-95"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-500"
                onClick={submitModal}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}