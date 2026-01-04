/**
 * Autocomplete Input Component
 * Shows suggestions while typing
 */

import { useState, useRef, useEffect } from 'react';

function AutocompleteInput({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Type to search...', 
  label,
  required = false,
  excludeValue = null,
  showIcon = false // Control whether to show the search icon
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Filter options based on input and deduplicate by case-insensitive name
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredOptions([]);
    } else {
      const filtered = options.filter(opt => 
        opt.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        opt.name.toLowerCase() !== excludeValue?.toLowerCase()
      );
      
      // Deduplicate by case-insensitive name (keep first occurrence)
      const seen = new Set();
      const deduplicated = filtered.filter(opt => {
        const normalizedName = opt.name.toLowerCase().trim();
        if (seen.has(normalizedName)) {
          return false;
        }
        seen.add(normalizedName);
        return true;
      });
      
      setFilteredOptions(deduplicated);
    }
    setHighlightedIndex(-1);
  }, [inputValue, options, excludeValue]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    
    const exactMatch = options.find(opt => 
      opt.name.toLowerCase() === newValue.toLowerCase()
    );
    
    if (exactMatch) {
      onChange(exactMatch.name);
    } else {
      onChange('');
    }
  };

  const handleSuggestionClick = (option) => {
    setInputValue(option.name);
    onChange(option.name);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSuggestionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleFocus = () => {
    if (inputValue.trim() !== '') {
      setShowSuggestions(true);
    }
  };

  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="autocomplete-container" ref={containerRef}>
      {label && <label className="autocomplete-label">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className="autocomplete-input"
        autoComplete="off"
      />
      
      {showSuggestions && filteredOptions.length > 0 && (
        <ul ref={suggestionsRef} className="autocomplete-suggestions">
          {filteredOptions.map((option, index) => (
            <li
              key={option.name}
              className={`suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
              onClick={() => handleSuggestionClick(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className="suggestion-icon">📍</span>
              <span className="suggestion-text">
                {highlightMatch(option.name, inputValue)}
              </span>
            </li>
          ))}
        </ul>
      )}
      
      {showSuggestions && inputValue && filteredOptions.length === 0 && (
        <div className="autocomplete-no-results">
          <span className="no-results-icon">🔍</span>
          <span>No matching locations found</span>
        </div>
      )}
    </div>
  );
}

export default AutocompleteInput;
