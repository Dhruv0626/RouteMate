import React from "react";

/**
 * Reusable chip selector component for review tags.
 * Props:
 *   tags       -> string array of tag options
 *   selected   -> array of currently selected tags
 *   onSelect   -> callback(tag) when chip is clicked
 *   maxSelect  -> number (default 3)
 */
const TagChipSelector = ({ tags = [], selected = [], onSelect, maxSelect = 3 }) => {
  const isMaxReached = selected.length >= maxSelect;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag);
        const isDisabled = !isSelected && isMaxReached;

        return (
          <button
            key={tag}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(tag)}
            className={`
              px-4 py-2 rounded-[20px] text-xs font-black tracking-wider uppercase transition-all duration-200
              ${isSelected 
                ? "bg-primary text-black border-primary scale-100 shadow-lg shadow-primary/20" 
                : "bg-white/5 text-(--text-dim) border border-white/10 hover:bg-white/10"
              }
              ${isDisabled ? "opacity-30 cursor-not-allowed grayscale" : "active:scale-95 cursor-pointer"}
              border
            `}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
};

export default TagChipSelector;
