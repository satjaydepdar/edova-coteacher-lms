// ==========================================
// Chemistry Data & Logic Utilities
// ==========================================

// Atom colors for visualization
export const ATOM_COLORS = {
  H: '#93C5FD', // light blue
  O: '#EF4444', // red
  N: '#3B82F6',
  C: '#333333',
  Fe: '#B87333',
  Na: '#A855F7',
  Cl: '#22C55E',
  S: '#EAB308',
  Ca: '#94A3B8',
  Mg: '#10B981',
  Zn: '#6B7280',
  Cu: '#F97316',
  K: '#EC4899',
  Ba: '#14B8A6',
  Ag: '#C0C0C0',
  Pb: '#475569',
  Al: '#D1D5DB',
};

export const ATOM_RADII = {
  H: 14,
  O: 18,
  N: 18,
  C: 20,
  Fe: 22,
  Na: 20,
  Cl: 20,
  S: 22,
  Ca: 22,
  Mg: 20,
  Zn: 22,
  Cu: 22,
  K: 22,
  Ba: 24,
  Ag: 22,
  Pb: 24,
  Al: 20,
};

export const COMMON_OXIDATION_STATES = {
  H: 1,
  O: -2,
  Na: 1,
  K: 1,
  Mg: 2,
  Ca: 2,
  Al: 3,
  Cl: -1,
  F: -1,
  Br: -1,
  I: -1,
  S: -2, // Mostly in binary
  Cu: 2, // Common
  Fe: 2, // Common, but can be 3
  Zn: 2,
  Mn: 4, // In MnO2
};

export const ION_CHARGES = {
  SO4: -2,
  NO3: -1,
  CO3: -2,
  OH: -1,
  PO4: -3,
  NH4: 1,
};

// ==========================================
// Predefined Reactions for Each Module
// ==========================================

export const EQUATION_REACTIONS = [
  {
    id: 'water_formation',
    name: 'Formation of Water',
    reactants: [
      { id: 'H2', formula: 'H₂', atoms: { H: 2 }, label: 'Hydrogen' },
      { id: 'O2', formula: 'O₂', atoms: { O: 2 }, label: 'Oxygen' },
    ],
    products: [
      { id: 'H2O', formula: 'H₂O', atoms: { H: 2, O: 1 }, label: 'Water' },
    ],
    balancedCoefficients: { r_H2: 2, r_O2: 1, p_H2O: 2 },
    type: 'exothermic',
    stateSymbols: { H2: '(g)', O2: '(g)', H2O: '(l)' },
  },
  {
    id: 'rust_formation',
    name: 'Rusting of Iron',
    reactants: [
      { id: 'Fe', formula: 'Fe', atoms: { Fe: 1 }, label: 'Iron' },
      { id: 'O2', formula: 'O₂', atoms: { O: 2 }, label: 'Oxygen' },
    ],
    products: [
      { id: 'Fe2O3', formula: 'Fe₂O₃', atoms: { Fe: 2, O: 3 }, label: 'Iron Oxide' },
    ],
    balancedCoefficients: { r_Fe: 4, r_O2: 3, p_Fe2O3: 2 },
    type: 'exothermic',
    stateSymbols: { Fe: '(s)', O2: '(g)', Fe2O3: '(s)' },
  },
  {
    id: 'magnesium_burn',
    name: 'Burning of Magnesium',
    reactants: [
      { id: 'Mg', formula: 'Mg', atoms: { Mg: 1 }, label: 'Magnesium' },
      { id: 'O2', formula: 'O₂', atoms: { O: 2 }, label: 'Oxygen' },
    ],
    products: [
      { id: 'MgO', formula: 'MgO', atoms: { Mg: 1, O: 1 }, label: 'Magnesium Oxide' },
    ],
    balancedCoefficients: { r_Mg: 2, r_O2: 1, p_MgO: 2 },
    type: 'exothermic',
    stateSymbols: { Mg: '(s)', O2: '(g)', MgO: '(s)' },
  },
  {
    id: 'hcl_naoh',
    name: 'Neutralization',
    reactants: [
      { id: 'HCl', formula: 'HCl', atoms: { H: 1, Cl: 1 }, label: 'Hydrochloric Acid' },
      { id: 'NaOH', formula: 'NaOH', atoms: { Na: 1, O: 1, H: 1 }, label: 'Sodium Hydroxide' },
    ],
    products: [
      { id: 'NaCl', formula: 'NaCl', atoms: { Na: 1, Cl: 1 }, label: 'Sodium Chloride' },
      { id: 'H2O', formula: 'H₂O', atoms: { H: 2, O: 1 }, label: 'Water' },
    ],
    balancedCoefficients: { r_HCl: 1, r_NaOH: 1, p_NaCl: 1, p_H2O: 1 },
    type: 'exothermic',
    stateSymbols: { HCl: '(aq)', NaOH: '(aq)', NaCl: '(aq)', H2O: '(l)' },
  },
];

export const REACTION_TYPES = {
  combination: {
    id: 'combination',
    name: 'Combination Reaction',
    description: 'Two or more substances combine to form a single product.',
    animation: 'merge',
    examples: [
      {
        id: 'cao_water',
        equation: 'CaO + H₂O → Ca(OH)₂',
        reactants: ['CaO', 'H₂O'],
        products: ['Ca(OH)₂'],
        description: 'Quick lime reacts with water to form slaked lime.',
        energyType: 'exothermic',
      },
      {
        id: 'c_o2',
        equation: 'C + O₂ → CO₂',
        reactants: ['C', 'O₂'],
        products: ['CO₂'],
        description: 'Carbon burns in oxygen to form carbon dioxide.',
        energyType: 'exothermic',
      },
    ],
  },
  decomposition: {
    id: 'decomposition',
    name: 'Decomposition Reaction',
    description: 'A single compound breaks down into two or more simpler substances.',
    animation: 'split',
    examples: [
      {
        id: 'caco3_heat',
        equation: 'CaCO₃ → CaO + CO₂',
        reactants: ['CaCO₃'],
        products: ['CaO', 'CO₂'],
        description: 'Limestone decomposes on heating.',
        energyType: 'endothermic',
      },
      {
        id: 'h2o_electrolysis',
        equation: '2H₂O → 2H₂ + O₂',
        reactants: ['H₂O'],
        products: ['H₂', 'O₂'],
        description: 'Electrolysis of water produces hydrogen and oxygen.',
        energyType: 'endothermic',
      },
    ],
  },
  displacement: {
    id: 'displacement',
    name: 'Displacement Reaction',
    description: 'A more reactive element displaces a less reactive one from its compound.',
    animation: 'replace',
    examples: [
      {
        id: 'fe_cuso4',
        equation: 'Fe + CuSO₄ → FeSO₄ + Cu',
        reactants: ['Fe', 'CuSO₄'],
        products: ['FeSO₄', 'Cu'],
        description: 'Iron displaces copper from copper sulphate solution.',
        energyType: 'exothermic',
      },
      {
        id: 'zn_hcl',
        equation: 'Zn + 2HCl → ZnCl₂ + H₂',
        reactants: ['Zn', 'HCl'],
        products: ['ZnCl₂', 'H₂'],
        description: 'Zinc displaces hydrogen from hydrochloric acid.',
        energyType: 'exothermic',
      },
    ],
  },
  doubleDisplacement: {
    id: 'doubleDisplacement',
    name: 'Double Displacement Reaction',
    description: 'Two compounds exchange ions to form two new compounds.',
    animation: 'exchange',
    examples: [
      {
        id: 'naoh_hcl',
        equation: 'NaOH + HCl → NaCl + H₂O',
        reactants: ['NaOH', 'HCl'],
        products: ['NaCl', 'H₂O'],
        description: 'Neutralization of sodium hydroxide with hydrochloric acid.',
        energyType: 'exothermic',
      },
      {
        id: 'na2so4_bacl2',
        equation: 'Na₂SO₄ + BaCl₂ → BaSO₄ + 2NaCl',
        reactants: ['Na₂SO₄', 'BaCl₂'],
        products: ['BaSO₄', 'NaCl'],
        description: 'Formation of insoluble barium sulphate.',
        energyType: 'exothermic',
      },
    ],
  },
  precipitation: {
    id: 'precipitation',
    name: 'Precipitation Reaction',
    description: 'Mixing two solutions produces an insoluble solid (precipitate).',
    animation: 'precipitate',
    examples: [
      {
        id: 'agno3_nacl',
        equation: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃',
        reactants: ['AgNO₃', 'NaCl'],
        products: ['AgCl↓', 'NaNO₃'],
        description: 'Silver chloride precipitates as white curdy solid.',
        energyType: 'exothermic',
      },
      {
        id: 'pb_ki',
        equation: 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃',
        reactants: ['Pb(NO₃)₂', 'KI'],
        products: ['PbI₂↓', 'KNO₃'],
        description: 'Lead iodide precipitates as bright yellow solid.',
        energyType: 'exothermic',
      },
    ],
  },
};

export const REDOX_REACTIONS = [
  {
    id: 'cuo_h2',
    equation: 'CuO + H₂ → Cu + H₂O',
    oxidized: 'H₂',
    reduced: 'CuO',
    oxidationDesc: 'Hydrogen gains oxygen → becomes H₂O (oxidized)',
    reductionDesc: 'Copper oxide loses oxygen → becomes Cu (reduced)',
    explanation:
      'This is a redox reaction. CuO is reduced (loses oxygen) and H₂ is oxidized (gains oxygen).',
    reactants: [
      { element: 'Cu', atoms: 1, formula: 'CuO', compounds: { O: 1 } },
      { element: 'H', atoms: 2, formula: 'H₂' }
    ],
    products: [
      { element: 'Cu', atoms: 1, formula: 'Cu' },
      { element: 'H', atoms: 2, formula: 'H₂O', compounds: { O: 1 } }
    ],
    oxidationNumbers: [
      { element: 'Cu', reactantState: '+2', productState: '0', type: 'reduction', electronChange: 'gain of 2e⁻' },
      { element: 'H', reactantState: '0', productState: '+1', type: 'oxidation', electronChange: 'loss of 1e⁻ per atom' },
      { element: 'O', reactantState: '-2', productState: '-2', type: 'neutral', electronChange: 'no change' }
    ]
  },
  {
    id: 'zno_c',
    equation: 'ZnO + C → Zn + CO',
    oxidized: 'C',
    reduced: 'ZnO',
    oxidationDesc: 'Carbon gains oxygen → becomes CO (oxidized)',
    reductionDesc: 'Zinc oxide loses oxygen → becomes Zn (reduced)',
    explanation:
      'Carbon acts as a reducing agent. ZnO loses oxygen (reduction) while C gains oxygen (oxidation).',
    reactants: [
      { element: 'Zn', atoms: 1, formula: 'ZnO', compounds: { O: 1 } },
      { element: 'C', atoms: 1, formula: 'C' }
    ],
    products: [
      { element: 'Zn', atoms: 1, formula: 'Zn' },
      { element: 'C', atoms: 1, formula: 'CO', compounds: { O: 1 } }
    ],
    oxidationNumbers: [
      { element: 'Zn', reactantState: '+2', productState: '0', type: 'reduction', electronChange: 'gain of 2e⁻' },
      { element: 'C', reactantState: '0', productState: '+2', type: 'oxidation', electronChange: 'loss of 2e⁻' },
      { element: 'O', reactantState: '-2', productState: '-2', type: 'neutral', electronChange: 'no change' }
    ]
  },
  {
    id: 'mno2_hcl',
    equation: 'MnO₂ + 4HCl → MnCl₂ + 2H₂O + Cl₂',
    oxidized: 'HCl',
    reduced: 'MnO₂',
    oxidationDesc: 'HCl loses hydrogen → Cl₂ is formed (oxidized)',
    reductionDesc: 'MnO₂ gains hydrogen → MnCl₂ is formed (reduced)',
    explanation:
      'MnO₂ is reduced (gains hydrogen) while HCl is oxidized (loses hydrogen to form Cl₂).',
    reactants: [
      { element: 'Mn', atoms: 1, formula: 'MnO₂', compounds: { O: 2 } },
      { element: 'Cl', atoms: 1, formula: 'HCl', compounds: { H: 1 } }
    ],
    products: [
      { element: 'Mn', atoms: 1, formula: 'MnCl₂', compounds: { Cl: 2 } },
      { element: 'Cl', atoms: 2, formula: 'Cl₂' }
    ],
    oxidationNumbers: [
      { element: 'Mn', reactantState: '+4', productState: '+2', type: 'reduction', electronChange: 'gain of 2e⁻' },
      { element: 'Cl', reactantState: '-1', productState: '0', type: 'oxidation', electronChange: 'loss of 1e⁻ per atom' },
      { element: 'H', reactantState: '+1', productState: '+1', type: 'neutral', electronChange: 'no change' },
      { element: 'O', reactantState: '-2', productState: '-2', type: 'neutral', electronChange: 'no change' }
    ]
  },
];

export const REAL_WORLD_EFFECTS = {
  corrosion: {
    id: 'corrosion',
    title: 'Corrosion (Rusting of Iron)',
    equation: '4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃ → 2Fe₂O₃·3H₂O (Rust)',
    description:
      'Iron reacts with oxygen and moisture to form hydrated iron(III) oxide (rust). This weakens structures over time.',
    factors: ['Oxygen presence', 'Moisture/water', 'Salt (accelerates)'],
    prevention: ['Painting', 'Oiling', 'Galvanizing (zinc coating)', 'Alloying'],
  },
  rancidity: {
    id: 'rancidity',
    title: 'Rancidity',
    equation: 'Fats/Oils + O₂ → Oxidized compounds (bad smell/taste)',
    description:
      'When fats and oils in food are oxidized, the food becomes rancid — developing an unpleasant smell and taste.',
    factors: ['Oxygen exposure', 'Heat', 'Light', 'Moisture'],
    prevention: [
      'Adding antioxidants (BHA, BHT)',
      'Storing in airtight containers',
      'Refrigeration',
      'Flushing with nitrogen gas',
    ],
  },
};

// ==========================================
// Utility Functions
// ==========================================

/**
 * Count atoms on one side of an equation given species and coefficients.
 */
export function countAtoms(species, coefficients, side) {
  const counts = {};
  species.forEach((s) => {
    const coeff = coefficients[`${side}_${s.id}`] || 1;
    if (s.atoms) {
      Object.entries(s.atoms).forEach(([atom, count]) => {
        counts[atom] = (counts[atom] || 0) + count * coeff;
      });
    }
  });
  return counts;
}

/**
 * Check if a given equation is balanced.
 */
export function isEquationBalanced(reactants, products, coefficients) {
  const reactantAtoms = countAtoms(reactants, coefficients, 'r');
  const productAtoms = countAtoms(products, coefficients, 'p');

  const allAtoms = new Set([...Object.keys(reactantAtoms), ...Object.keys(productAtoms)]);
  for (const atom of allAtoms) {
    if ((reactantAtoms[atom] || 0) !== (productAtoms[atom] || 0)) {
      return false;
    }
  }
  return true;
}

/**
 * Get a formatted display of the equation with coefficients.
 */
export function formatEquation(reactants, products, coefficients) {
  const formatSide = (species, side) =>
    species
      .map((s) => {
        const coeff = coefficients[`${side}_${s.id}`] || 1;
        return coeff > 1 ? `${coeff}${s.formula}` : s.formula;
      })
      .join(' + ');

  return `${formatSide(reactants, 'r')} → ${formatSide(products, 'p')}`;
}

/**
 * Generate random shuffle of reaction types for identification game.
 */
export function getShuffledReactionTypes() {
  const types = Object.keys(REACTION_TYPES);
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

/**
 * Parse a chemical formula into atom counts.
 * e.g., "Fe2O3" -> { Fe: 2, O: 3 }
 */
export function parseFormula(formula) {
  const atoms = {};
  const regex = /([A-Z][a-z]?)(\d*)/g;
  let match;
  
  while ((match = regex.exec(formula)) !== null) {
    const element = match[1];
    const count = parseInt(match[2]) || 1;
    atoms[element] = (atoms[element] || 0) + count;
  }
  
  return atoms;
}

/**
 * Parse a skeletal equation string into reactants and products.
 * e.g., "Fe + O2 -> Fe2O3"
 */
export function parseSkeletalEquation(input) {
  try {
    const cleanInput = input.replace(/\s+/g, '');
    const sides = cleanInput.split(/->|→/);
    
    if (sides.length !== 2) throw new Error("Invalid equation format. Use '->' to separate sides.");
    
    const parseSide = (sideStr) => {
      return sideStr.split('+').filter(Boolean).map((formula, index) => {
        const atoms = parseFormula(formula);
        if (Object.keys(atoms).length === 0) throw new Error(`Invalid formula: ${formula}`);
        return {
          id: `${formula}_${index}_${Math.random().toString(36).substr(2, 4)}`,
          formula: formula,
          atoms: atoms,
          label: formula
        };
      });
    };
    
    const reactants = parseSide(sides[0]);
    const products = parseSide(sides[1]);
    
    if (reactants.length === 0 || products.length === 0) {
      throw new Error("Equation must have both reactants and products.");
    }
    
    return { reactants, products };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Advanced: Detect redox changes between reactants and products.
 * Returns an array of elements with their oxidation state changes.
 */
export function detectRedox(reactants, products) {
  const getOxidationStates = (speciesList) => {
    const states = {};
    speciesList.forEach(s => {
      const atoms = s.atoms;
      const elements = Object.keys(atoms);
      
      // Rule 1: Free elements are 0
      if (elements.length === 1) {
        states[elements[0]] = 0;
      } else {
        // Rule 2: Compounds (Simplified for school level)
        elements.forEach(el => {
          if (el === 'O') states[el] = -2;
          else if (el === 'H') states[el] = 1;
          else if (COMMON_OXIDATION_STATES[el]) states[el] = COMMON_OXIDATION_STATES[el];
          else {
             // Try to solve for the unknown element (e.g., S in SO4)
             // For Class 10, we'll keep it simple: assume common states
             states[el] = COMMON_OXIDATION_STATES[el] || 0;
          }
        });
      }
    });
    return states;
  };

  const reactantStates = getOxidationStates(reactants);
  const productStates = getOxidationStates(products);
  
  const results = [];
  const allElements = new Set([...Object.keys(reactantStates), ...Object.keys(productStates)]);
  
  allElements.forEach(el => {
    if (reactantStates[el] !== undefined && productStates[el] !== undefined) {
      const diff = productStates[el] - reactantStates[el];
      if (diff !== 0) {
        results.push({
          element: el,
          reactantState: reactantStates[el] >= 0 ? `+${reactantStates[el]}` : reactantStates[el],
          productState: productStates[el] >= 0 ? `+${productStates[el]}` : productStates[el],
          type: diff > 0 ? 'oxidation' : 'reduction',
          electronChange: diff > 0 ? `loss of ${Math.abs(diff)}e⁻` : `gain of ${Math.abs(diff)}e⁻`
        });
      }
    }
  });
  
  return results;
}
