/**
 * Attribute Selector Menu Component
 * Dropdown menu for selecting attributes
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';
import { useStore } from '@xyflow/react';
import { XCircle, ArrowsInSimple, ArrowsOutSimple, Trash, CaretDown, CaretRight, Plus } from '@phosphor-icons/react';
import type { Attribute } from '../../types';
import { AttributeListItem } from './AttributeListItem';
import { attributesApi } from '../../api';
import type { AttributeType } from '../../types';
import { ATTRIBUTE_TYPE_LABELS } from './attributeTypes';

function groupAttributesByType(attributes: Attribute[]): Record<string, Attribute[]> {
  return attributes.reduce((acc, attr) => {
    const type = (attr.type || '').toLowerCase();
    if (!acc[type]) acc[type] = [];
    acc[type].push(attr);
    return acc;
  }, {} as Record<string, Attribute[]>);
}

interface AttributeSelectorMenuProps {
  anchorRef: React.RefObject<HTMLElement>;
  allAttributes: Attribute[];
  currentValue: Attribute | null;
  onSelect: (attr: Attribute) => void;
  onClose: () => void;
  onRemove?: () => void;
  expandAllByDefault?: boolean;
  context?: string;
  excludedAttributeIds?: Set<string>;
  teamId?: string;
  projectId?: string;
  onAttributeCreated?: (attr: Attribute) => void;
}

export function AttributeSelectorMenu({
  anchorRef,
  allAttributes,
  currentValue,
  onSelect,
  onClose,
  onRemove,
  expandAllByDefault = false,
  context = 'canvas',
  excludedAttributeIds = new Set(),
  teamId,
  projectId,
  onAttributeCreated,
}: AttributeSelectorMenuProps) {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (expandAllByDefault) {
      const allOpen: Record<string, boolean> = {};
      const grouped = groupAttributesByType(allAttributes);
      Object.keys(grouped).forEach((type) => {
        if (grouped[type] && grouped[type].length > 0) {
          allOpen[type] = true;
        }
      });
      return allOpen;
    } else {
      const t = (currentValue?.type || '').toLowerCase();
      return t ? { [t]: true } : {};
    }
  });
  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (!currentValue) return 0;
    const flattened = Object.values(groupAttributesByType(allAttributes)).flat();
    return flattened.findIndex((attr) => attr.id === currentValue.id);
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);

  // Get React Flow viewport transform [x, y, zoom] for canvas context
  // Always call the hook; only use values when in canvas context
  const flowTransform = useStore((state) => {
    const t = (state as any)?.transform;
    return Array.isArray(t) && t.length >= 3 ? t : [0, 0, 1];
  }) as [number, number, number];
  const [viewportX, viewportY, flowZoom] = flowTransform || [0, 0, 1];
  const zoom = context === 'canvas' ? flowZoom : 1;

  // Memoize popper modifiers
  const popperModifiers = useMemo(() => [
    { name: 'offset', options: { offset: [0, 4] } },
    { name: 'preventOverflow', options: { padding: 8 } },
    {
      name: 'flip',
      options: {
        fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
        padding: 8,
      },
    },
    {
      name: 'computeStyles',
      options: {
        gpuAcceleration: false,
        adaptive: true,
      },
    },
  ], []);

  // Use react-popper for positioning
  const { styles, attributes, update } = usePopper(
    anchorRef.current,
    popperElement,
    {
      placement: 'bottom-start',
      strategy: 'fixed', // Always use fixed for portaled elements
      modifiers: popperModifiers,
    }
  );

  // Update popper position when canvas pans/zooms (canvas context only)
  useEffect(() => {
    if (update && context === 'canvas') {
      update();
    }
  }, [viewportX, viewportY, zoom, update, context]);

  // Filter and group attributes
  const filtered = useMemo(() => {
    let filtered = allAttributes;

    // Filter out excluded attributes (already assigned to step)
    // But if we have a currentValue (editing existing attribute), keep that one even if it's in excludedAttributeIds
    if (currentValue) {
      filtered = filtered.filter(
        (attr) => !excludedAttributeIds.has(attr.id) || attr.id === currentValue.id
      );
    } else {
      filtered = filtered.filter((attr) => !excludedAttributeIds.has(attr.id));
    }

    // Filter by search
    if (search) {
      filtered = filtered.filter((attr) =>
        attr.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [allAttributes, search, excludedAttributeIds, currentValue]);

  const grouped = useMemo(() => {
    return groupAttributesByType(filtered);
  }, [filtered]);

  // Flatten all visible attributes and create buttons for keyboard navigation
  const flattenedItems = useMemo(() => {
    const items: Array<{ type?: string; itemType: string; attr?: Attribute; isOpen?: boolean; hasResults?: boolean }> = [];
    Object.keys(ATTRIBUTE_TYPE_LABELS).forEach((type) => {
      const hasResults = (grouped[type] || []).length > 0;
      const isOpen = search ? hasResults || openSections[type] : openSections[type];

      // Always include category headers for navigation
      items.push({ type, itemType: 'categoryHeader', isOpen, hasResults });

      // Add attributes if category is open and has results
      if (isOpen && grouped[type]) {
        grouped[type].forEach((attr) => {
          items.push({ attr, type, itemType: 'attribute' });
        });
      }

      // Add create button if search is active and this section is open
      if (search && isOpen) {
        items.push({ type, itemType: 'createButton' });
      }
    });
    return items;
  }, [grouped, openSections, search]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flattenedItems.length === 0) return;

    const currentItem = flattenedItems[selectedIndex] || {};

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        e.stopPropagation();
        if (selectedIndex < flattenedItems.length - 1) {
          setSelectedIndex((prev) => prev + 1);
        } else {
          setSelectedIndex(0);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        e.stopPropagation();
        if (selectedIndex > 0) {
          setSelectedIndex((prev) => prev - 1);
        } else {
          setSelectedIndex(flattenedItems.length - 1);
        }
        break;
      }
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (currentItem.itemType === 'attribute' && currentItem.attr) {
          onSelect(currentItem.attr);
          onClose();
        } else if (currentItem.itemType === 'createButton' && currentItem.type) {
          handleCreateAttribute(currentItem.type);
        } else if (currentItem.itemType === 'categoryHeader' && currentItem.type) {
          toggleSection(currentItem.type);
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
    }
  };

  useEffect(() => {
    const currentItem = flattenedItems[selectedIndex];
    if (currentItem) {
      let node: HTMLElement | null = null;

      if (currentItem.itemType === 'attribute' && currentItem.attr) {
        const selectedId = currentItem.attr.id;
        node = itemRefs.current[selectedId];
      } else if (currentItem.itemType === 'categoryHeader' && currentItem.type) {
        const headerElement = menuRef.current?.querySelector(
          `[data-category-header="${currentItem.type}"]`
        ) as HTMLElement | null;
        node = headerElement;
      } else if (currentItem.itemType === 'createButton' && currentItem.type) {
        const buttonElement = menuRef.current?.querySelector(
          `[data-create-button="${currentItem.type}"]`
        ) as HTMLElement | null;
        node = buttonElement;
      }

      if (node) {
        node.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex, flattenedItems]);

  // Preserve selected index when search changes if possible
  useEffect(() => {
    setSelectedIndex((prevIndex) => {
      if (flattenedItems.length === 0) return 0;

      const prevItem = flattenedItems[prevIndex];
      if (prevItem) {
        const sameIndex = flattenedItems.findIndex((item) => {
          if (prevItem.itemType === 'attribute' && item.itemType === 'attribute') {
            return prevItem.attr?.id === item.attr?.id;
          }
          if (prevItem.itemType === 'categoryHeader' && item.itemType === 'categoryHeader') {
            return prevItem.type === item.type;
          }
          if (prevItem.itemType === 'createButton' && item.itemType === 'createButton') {
            return prevItem.type === item.type;
          }
          return false;
        });

        if (sameIndex !== -1) return sameIndex;
      }

      return Math.min(prevIndex || 0, flattenedItems.length - 1);
    });
  }, [search, flattenedItems]);

  // Expand/collapse all sections
  const expandAll = () => {
    const allOpen: Record<string, boolean> = {};
    Object.keys(grouped).forEach((type) => {
      if (grouped[type] && grouped[type].length > 0) {
        allOpen[type] = true;
      }
    });
    setOpenSections(allOpen);
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  const isAllExpanded = Object.keys(grouped).every(
    (type) => grouped[type] && grouped[type].length > 0 && openSections[type]
  );

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        !menuRef.current ||
        menuRef.current.contains(e.target as Node) ||
        (anchorRef.current && anchorRef.current.contains(e.target as Node))
      )
        return;
      onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose, anchorRef]);

  // Focus the search input when the menu opens
  useEffect(() => {
    const searchInput = menuRef.current?.querySelector('input');
    if (searchInput) {
      (searchInput as HTMLInputElement).focus();
    }
  }, []);

  // Add global keyboard event listener for navigation when menu is open
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        handleKeyDown(e as unknown as React.KeyboardEvent);
      } else if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleKeyDown]);

  // Accordion toggle
  const toggleSection = (type: string) => {
    setOpenSections((s) => ({ ...s, [type]: !s[type] }));
  };

  // Create new attribute
  const handleCreateAttribute = async (type: string) => {
    if (!search.trim() || isCreating || !teamId) return;

    setIsCreating(true);
    try {
      const attributeData = {
        name: search.trim(),
        type: type.toLowerCase() as AttributeType,
        description: undefined,
        team_id: teamId,
        ...(projectId && { project_id: projectId }),
      };

      const createdAttribute = await attributesApi.createAttribute(teamId, attributeData);

      // Call the callback to notify parent components
      if (onAttributeCreated) {
        onAttributeCreated(createdAttribute);
      }

      // Select the newly created attribute
      onSelect(createdAttribute);
      onClose();
    } catch (error) {
      console.error('Failed to create attribute:', error);
      alert('Failed to create attribute. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Don't render if anchor is not available
  if (!anchorRef.current) {
    return null;
  }

  // Apply zoom scaling for canvas context
  const menuStyle = {
    ...styles.popper,
    transform: context === 'canvas' 
      ? `${styles.popper?.transform || ''} scale(${zoom})`
      : styles.popper?.transform || '',
    transformOrigin: context === 'canvas' ? 'top left' : undefined,
    zIndex: context === 'context-pane' ? 10000000 : 10000,
    pointerEvents: 'auto' as const,
  };

  return createPortal(
    <div
      ref={(el) => {
        if (menuRef) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (menuRef as any).current = el;
        }
        setPopperElement(el);
      }}
      onWheelCapture={(e) => {
        // If not zooming (ctrl/meta key not pressed), stop event reaching canvas
        if (!e.ctrlKey && !e.metaKey) {
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className="attribute-selector-menu"
      style={menuStyle}
      {...attributes.popper}
    >
      <div className="attribute-selector-menu-content">
        <div className="attribute-selector-menu-header">
          <div className="attribute-selector-search-container">
            <input
              autoFocus
              className="attribute-selector-search-input"
              placeholder="Search or add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onKeyDown={handleKeyDown}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="attribute-selector-search-clear"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                <XCircle size={14} weight="bold" />
              </button>
            )}
            {!search && (
              <button
                onClick={isAllExpanded ? collapseAll : expandAll}
                className="attribute-selector-search-expand"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                {isAllExpanded ? (
                  <ArrowsInSimple size={14} weight="bold" />
                ) : (
                  <ArrowsOutSimple size={14} weight="bold" />
                )}
              </button>
            )}
          </div>
          {onRemove && currentValue && (
            <button
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="attribute-selector-remove-button"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              title="Remove attribute"
            >
              <Trash size={14} weight="bold" />
            </button>
          )}
        </div>
        <div className="attribute-selector-menu-list">
          {Object.entries(ATTRIBUTE_TYPE_LABELS).map(([type, label]) => {
            const hasResults = (grouped[type] || []).length > 0;
            const isOpen = search ? hasResults || openSections[type] : openSections[type];
            const categoryHeaderIndex = flattenedItems.findIndex(
              (item) => item.itemType === 'categoryHeader' && item.type === type
            );
            const isKeyboardSelected = categoryHeaderIndex === selectedIndex;
            return (
              <div key={type} className="attribute-selector-category">
                <div
                  data-category-header={type}
                  className={`attribute-selector-category-header ${isKeyboardSelected ? 'attribute-selector-category-header-selected' : ''}`}
                  onClick={() => toggleSection(type)}
                >
                  <div className="attribute-selector-category-header-content">
                    <span className="attribute-selector-category-label">{label}</span>
                    <span className="attribute-selector-category-count">
                      {(grouped[type] || []).length}
                    </span>
                  </div>
                  {isOpen ? (
                    <CaretDown size={12} weight="bold" />
                  ) : (
                    <CaretRight size={12} weight="bold" />
                  )}
                </div>
                {isOpen && (
                  <div className="attribute-selector-category-items">
                    {(grouped[type] || []).map((attr) => {
                      const flattenedIndex = flattenedItems.findIndex(
                        (f) => f.itemType === 'attribute' && f.attr?.id === attr.id
                      );
                      const isKeyboardSelected = flattenedIndex === selectedIndex;
                      return (
                        <AttributeListItem
                          ref={(el) => (itemRefs.current[attr.id] = el)}
                          key={attr.id}
                          attribute={attr}
                          isSelected={!!(currentValue && currentValue.id === attr.id)}
                          isKeyboardSelected={isKeyboardSelected}
                          onSelect={() => {
                            onSelect(attr);
                            onClose();
                          }}
                        />
                      );
                    })}
                    {/* Add button - only show when there's search text */}
                    {search && (() => {
                      const createButtonIndex = flattenedItems.findIndex(
                        (item) => item.itemType === 'createButton' && item.type === type
                      );
                      const isKeyboardSelected = createButtonIndex === selectedIndex;
                      return (
                        <button
                          data-create-button={type}
                          className={`attribute-selector-create-button ${isKeyboardSelected ? 'attribute-selector-create-button-selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateAttribute(type);
                          }}
                          disabled={isCreating || false}
                        >
                          <Plus size={12} weight="regular" className="attribute-selector-create-icon" />
                          <span
                            className="attribute-selector-create-text"
                            title={
                              isCreating
                                ? 'Creating...'
                                : `Add "${search}" as ${label.slice(0, -1)}`
                            }
                          >
                            {isCreating
                              ? 'Creating...'
                              : `Add "${search}" as ${label.slice(0, -1)}`}
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

