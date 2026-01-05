/**
 * Curriculum Standards Configuration
 * Supports: ICSE (default), CBSE, State Boards, JEE, NEET
 */

export type Board = 'icse' | 'cbse' | 'state';
export type ExamMode = 'board' | 'jee' | 'neet';

interface CurriculumStandard {
    board: Board;
    examMode?: ExamMode;
    classLevel: string;
    subject: string;
    topics: string[];
    expectedComplexity: number; // 1-5 scale
    sampleQuestionPatterns: string[];
    notationRequirements: string[];
    avoidPatterns: string[]; // Things NOT to generate
}

/**
 * ICSE/ISC Class 11 Curriculum (Default)
 */
export const ICSE_CLASS_11: Record<string, CurriculumStandard> = {
    mathematics: {
        board: 'icse',
        classLevel: 'class 11',
        subject: 'mathematics',
        expectedComplexity: 4,
        topics: [
            'Sets and their representations',
            'Venn diagrams and set operations',
            'Relations and Functions',
            'Trigonometric Functions (domain, range, graphs)',
            'Complex Numbers (Argand plane, polar form)',
            'Quadratic Equations',
            'Linear Inequations',
            'Permutations and Combinations',
            'Binomial Theorem',
            'Sequences and Series (AP, GP, AM-GM relation)',
            'Coordinate Geometry (Straight Lines)',
            'Conic Sections (Parabola, Ellipse, Hyperbola)',
            'Limits and Derivatives',
            'Statistics (Variance, Standard Deviation)',
            'Probability'
        ],
        sampleQuestionPatterns: [
            'Let A = {1, 2, 3} and B = {2, 3, 4}. Find A ∩ B and verify |A ∪ B| = |A| + |B| - |A ∩ B|.',
            'Find the domain of f(x) = √(x² - 4x + 3) / log₁₀(5 - x).',
            'If z = 3 + 4i, express z in polar form and find z².',
            'How many 4-digit numbers can be formed using digits 1, 2, 3, 4, 5 without repetition?',
            'Find the coefficient of x⁵ in the expansion of (1 + x)¹⁰.',
            'Prove that lim(x→0) sin(x)/x = 1 using first principles.'
        ],
        notationRequirements: [
            'Use set notation: ∪, ∩, ⊂, ⊆, ∅, ∈',
            'Use function notation: f(x), f: A → B',
            'Use complex number notation: i, z, |z|, arg(z)',
            'Use proper mathematical symbols: ∑, ∏, lim, →, ≤, ≥',
            'Use LaTeX for fractions, roots, and exponents'
        ],
        avoidPatterns: [
            'Simple arithmetic word problems',
            'Basic ratio and proportion',
            'Elementary profit-loss calculations',
            'Simple interest/compound interest basics',
            'Primary school level geometry',
            'Questions that can be solved mentally without steps'
        ]
    },
    physics: {
        board: 'icse',
        classLevel: 'class 11',
        subject: 'physics',
        expectedComplexity: 4,
        topics: [
            'Units and Measurements (dimensional analysis)',
            'Kinematics (motion in straight line and plane)',
            'Laws of Motion (Newton\'s laws, friction)',
            'Work, Energy and Power',
            'System of Particles and Rotational Motion',
            'Gravitation (Kepler\'s laws, satellites)',
            'Mechanical Properties of Solids (stress-strain, Young\'s modulus)',
            'Mechanical Properties of Fluids (Pascal\'s law, Bernoulli\'s theorem)',
            'Heat and Thermodynamics',
            'Kinetic Theory of Gases',
            'Oscillations (SHM, pendulum)',
            'Waves (transverse, longitudinal, Doppler effect)'
        ],
        sampleQuestionPatterns: [
            'A projectile is launched at angle θ with initial velocity v. Derive the expression for maximum height and range.',
            'Using dimensional analysis, derive the expression for the time period of a simple pendulum.',
            'A block of mass m slides down a rough inclined plane of angle θ. Find the acceleration if coefficient of friction is μ.',
            'Derive Bernoulli\'s equation and apply it to find the velocity of efflux from a tank.',
            'Calculate the work done by an ideal gas in an isothermal expansion from V₁ to V₂.'
        ],
        notationRequirements: [
            'Always include SI units',
            'Use vector notation where applicable: v⃗, F⃗',
            'Show free body diagrams conceptually',
            'Use proper calculus notation for derivatives',
            'Include dimensional formulas'
        ],
        avoidPatterns: [
            'Simple unit conversions without concept application',
            'Direct formula substitution problems',
            'Basic speed-distance-time without physics concepts',
            'Questions without physical reasoning'
        ]
    },
    chemistry: {
        board: 'icse',
        classLevel: 'class 11',
        subject: 'chemistry',
        expectedComplexity: 4,
        topics: [
            'Basic Concepts (mole concept, stoichiometry)',
            'Atomic Structure (quantum numbers, electron configurations)',
            'Chemical Bonding (VSEPR, hybridization, MO theory)',
            'States of Matter (gas laws, kinetic theory)',
            'Chemical Thermodynamics (enthalpy, entropy, Gibbs energy)',
            'Chemical Equilibrium (Le Chatelier\'s principle)',
            'Redox Reactions (oxidation states, balancing)',
            's-Block Elements',
            'p-Block Elements',
            'Organic Chemistry basics (IUPAC nomenclature)',
            'Hydrocarbons (alkanes, alkenes, alkynes)'
        ],
        sampleQuestionPatterns: [
            'Calculate the number of moles of electrons in 1 faraday of charge.',
            'Predict the geometry of SF₆ using VSEPR theory and explain the hybridization.',
            'Balance the following redox reaction in acidic medium: MnO₄⁻ + Fe²⁺ → Mn²⁺ + Fe³⁺',
            'Calculate ΔG° at 298 K if ΔH° = -50 kJ/mol and ΔS° = -100 J/K·mol.',
            'Write the IUPAC name for: CH₃-CH(CH₃)-CH₂-CH=CH₂'
        ],
        notationRequirements: [
            'Use proper chemical formulas and equations',
            'Balance all chemical equations',
            'Use IUPAC nomenclature',
            'Include oxidation states where relevant',
            'Use proper electron configuration notation'
        ],
        avoidPatterns: [
            'Simple element identification',
            'Basic atomic number questions',
            'Direct recall of periodic table positions',
            'Elementary balancing of simple equations'
        ]
    },
    biology: {
        board: 'icse',
        classLevel: 'class 11',
        subject: 'biology',
        expectedComplexity: 4,
        topics: [
            'Diversity of Living Organisms (taxonomy, classification)',
            'Biological Classification (Five Kingdom system)',
            'Plant Kingdom',
            'Animal Kingdom',
            'Morphology and Anatomy of Flowering Plants',
            'Cell Structure and Function',
            'Cell Cycle and Cell Division',
            'Biomolecules (proteins, carbohydrates, lipids, nucleic acids)',
            'Transport in Plants',
            'Mineral Nutrition',
            'Photosynthesis (C3, C4 pathways)',
            'Respiration in Plants',
            'Digestion and Absorption',
            'Breathing and Exchange of Gases',
            'Body Fluids and Circulation',
            'Excretory Products and Elimination',
            'Locomotion and Movement'
        ],
        sampleQuestionPatterns: [
            'Compare and contrast the ultrastructure of mitochondria and chloroplast.',
            'Explain the mechanism of stomatal opening and closing with reference to potassium ion transport.',
            'Describe the C4 pathway of photosynthesis and its significance in tropical plants.',
            'Explain the countercurrent mechanism in the loop of Henle.',
            'Compare the structure and function of skeletal, cardiac, and smooth muscle tissues.'
        ],
        notationRequirements: [
            'Use proper biological terminology',
            'Include genus-species names in italics where applicable',
            'Reference specific cellular structures and organelles',
            'Use biochemical pathway notation'
        ],
        avoidPatterns: [
            'Simple organ identification',
            'Basic body part naming',
            'Elementary food chain questions',
            'Direct recall of definitions only'
        ]
    }
};

/**
 * ICSE Class 9 Curriculum
 */
export const ICSE_CLASS_9: Record<string, CurriculumStandard> = {
    mathematics: {
        board: 'icse',
        classLevel: 'class 9',
        subject: 'mathematics',
        expectedComplexity: 3,
        topics: [
            'Rational and Irrational Numbers (surds)',
            'Compound Interest',
            'Expansions and Factorisation',
            'Simultaneous Linear Equations',
            'Indices and Logarithms',
            'Triangles (mid-point theorem, Pythagoras)',
            'Rectilinear Figures (properties of parallelograms)',
            'Coordinate Geometry (distance formula, plotting)',
            'Trigonometry (basic ratios)',
            'Statistics (mean, median, graphical representation)',
            'Mensuration (area of triangles and quadrilaterals)'
        ],
        sampleQuestionPatterns: [
            'Simplify: (√3 + √2)² - (√3 - √2)²',
            'Find the compound interest on Rs. 10,000 at 8% p.a. for 2 years compounded annually.',
            'Factorize: x³ - 8y³ - 6x²y + 12xy²',
            'Solve: 3x + 4y = 10; 2x - 3y = 1 using elimination method.',
            'If log₁₀2 = 0.3010, find log₁₀8.',
            'Prove that the line joining the mid-points of two sides of a triangle is parallel to the third side.'
        ],
        notationRequirements: [
            'Use proper surd notation: √, ³√',
            'Show step-by-step algebraic manipulation',
            'Use coordinate notation (x, y)',
            'Include proper geometric reasoning'
        ],
        avoidPatterns: [
            'Simple addition/subtraction of integers',
            'Basic BODMAS without algebraic context',
            'Direct formula substitution only',
            'Questions below Class 7 level'
        ]
    },
    physics: {
        board: 'icse',
        classLevel: 'class 9',
        subject: 'physics',
        expectedComplexity: 3,
        topics: [
            'Measurements and SI Units',
            'Motion in One Dimension (velocity, acceleration, graphs)',
            'Laws of Motion (Newton\'s laws, friction)',
            'Fluids (pressure, Archimedes principle, buoyancy)',
            'Heat and Temperature',
            'Light (reflection, mirrors)',
            'Sound (wave properties, echo)',
            'Electricity and Magnetism basics'
        ],
        sampleQuestionPatterns: [
            'A car accelerates uniformly from 20 m/s to 40 m/s in 5 seconds. Calculate the acceleration and distance covered.',
            'A block of wood floats in water with 2/3 of its volume submerged. Calculate the density of wood.',
            'Derive the three equations of motion using velocity-time graphs.',
            'Explain the laws of reflection and show that the angle of incidence equals angle of reflection.'
        ],
        notationRequirements: [
            'Include SI units in all calculations',
            'Use proper velocity/acceleration symbols',
            'Draw or describe graphs where applicable'
        ],
        avoidPatterns: [
            'Simple unit conversions only',
            'Direct recall definitions',
            'Questions without calculation or reasoning'
        ]
    },
    chemistry: {
        board: 'icse',
        classLevel: 'class 9',
        subject: 'chemistry',
        expectedComplexity: 3,
        topics: [
            'Matter and its Composition',
            'Atomic Structure (subatomic particles, models)',
            'Chemical Equations (balancing)',
            'Periodic Table basics',
            'Study of Gas Laws',
            'Water (properties, hard and soft water)',
            'Solution, Colloids, Suspensions',
            'Elementary idea of bonding'
        ],
        sampleQuestionPatterns: [
            'Calculate the number of atoms in 2 moles of carbon dioxide.',
            'Balance: Fe + H₂O → Fe₃O₄ + H₂',
            'Compare the properties of ionic and covalent compounds.',
            'Explain Boyle\'s law with an example and state the mathematical relationship.'
        ],
        notationRequirements: [
            'Use proper chemical formulas',
            'Balance all equations',
            'Use subscripts for atoms'
        ],
        avoidPatterns: [
            'Simple element naming',
            'Direct recall of atomic numbers only'
        ]
    },
    biology: {
        board: 'icse',
        classLevel: 'class 9',
        subject: 'biology',
        expectedComplexity: 3,
        topics: [
            'Cell: Basic Unit of Life',
            'Tissues (plant and animal)',
            'Skin (structure and functions)',
            'Digestive System',
            'Respiratory System',
            'Disease: Cause and Control',
            'Health and Hygiene'
        ],
        sampleQuestionPatterns: [
            'Differentiate between plant cell and animal cell with a labeled diagram.',
            'Explain the mechanism of breathing in humans with reference to the diaphragm.',
            'Describe the structure of human skin and its role in temperature regulation.',
            'Compare arteries, veins, and capillaries in terms of structure and function.'
        ],
        notationRequirements: [
            'Use proper biological terms',
            'Reference diagrams conceptually'
        ],
        avoidPatterns: [
            'Simple body part naming',
            'Direct definition recall only'
        ]
    }
};

/**
 * ICSE Class 10 Curriculum
 */
export const ICSE_CLASS_10: Record<string, CurriculumStandard> = {
    mathematics: {
        board: 'icse',
        classLevel: 'class 10',
        subject: 'mathematics',
        expectedComplexity: 3.5,
        topics: [
            'GST (Goods and Services Tax)',
            'Banking (recurring deposits)',
            'Shares and Dividends',
            'Linear Inequations',
            'Quadratic Equations (factorization, formula)',
            'Ratio and Proportion',
            'Matrices',
            'Arithmetic and Geometric Progression',
            'Coordinate Geometry (section formula, slope)',
            'Similarity (theorems, applications)',
            'Circles (tangent properties, chord properties)',
            'Trigonometry (identities, heights and distances)',
            'Mensuration (surface area, volume of solids)',
            'Statistics (mean, median, mode, ogive)',
            'Probability'
        ],
        sampleQuestionPatterns: [
            'A shopkeeper buys an article for Rs. 5000 and sells it for Rs. 6000. Calculate GST at 18% and the amount payable.',
            'Find the roots of 2x² - 5x + 2 = 0 using the quadratic formula.',
            'If A = [2 3; 1 4], find A² - 3A + 2I.',
            'The 5th term of an AP is 23 and the 12th term is 51. Find the first term and common difference.',
            'From the top of a 30m tower, the angle of depression of an object on the ground is 45°. Find the distance of the object from the tower.',
            'Construct an ogive for the given data and find the median.'
        ],
        notationRequirements: [
            'Use matrix notation with brackets',
            'Show quadratic formula application',
            'Use AP/GP notation: a, d, r, Sₙ',
            'Include proper trigonometric notation'
        ],
        avoidPatterns: [
            'Simple percentage calculations',
            'Basic ratio simplification',
            'Direct formula application without reasoning',
            'Questions below Class 8 level'
        ]
    },
    physics: {
        board: 'icse',
        classLevel: 'class 10',
        subject: 'physics',
        expectedComplexity: 3.5,
        topics: [
            'Force, Work, Power and Energy',
            'Machines (mechanical advantage, velocity ratio)',
            'Refraction of Light (Snell\'s law, lenses)',
            'Total Internal Reflection',
            'Sound (reflection, characteristics)',
            'Electricity (Ohm\'s law, circuits, power)',
            'Magnetic Effects of Current',
            'Electromagnetic Induction',
            'Calorimetry',
            'Radioactivity and Nuclear Energy'
        ],
        sampleQuestionPatterns: [
            'A crowbar of length 2m has its fulcrum at 40cm from the load end. Calculate the mechanical advantage.',
            'A ray of light travels from glass (n=1.5) to air. Calculate the critical angle for total internal reflection.',
            'Three resistors 2Ω, 3Ω, and 6Ω are connected in parallel across a 12V source. Find the equivalent resistance and total current.',
            'Explain Lenz\'s law and show how it is consistent with the law of conservation of energy.',
            'Calculate the heat required to convert 100g of ice at -10°C to steam at 100°C.'
        ],
        notationRequirements: [
            'Always include SI units',
            'Show circuit diagrams conceptually',
            'Use lens formula: 1/f = 1/v - 1/u',
            'Include power and energy calculations'
        ],
        avoidPatterns: [
            'Simple definitions without application',
            'Direct formula substitution only',
            'Questions without numerical analysis'
        ]
    },
    chemistry: {
        board: 'icse',
        classLevel: 'class 10',
        subject: 'chemistry',
        expectedComplexity: 3.5,
        topics: [
            'Periodic Table and Periodicity',
            'Chemical Bonding (electrovalent, covalent)',
            'Acids, Bases and Salts',
            'Analytical Chemistry (identification tests)',
            'Mole Concept and Stoichiometry',
            'Electrolysis',
            'Metallurgy',
            'Organic Chemistry (hydrocarbons, functional groups)',
            'Study of Compounds (HCl, HNO₃, H₂SO₄, NH₃)'
        ],
        sampleQuestionPatterns: [
            'Explain the variation of atomic radius across a period and down a group.',
            'Calculate the volume of CO₂ at STP produced when 10g of CaCO₃ reacts with excess HCl.',
            'Draw the electron dot structure of CH₄ and explain the type of bonding.',
            'Describe the electrolysis of acidified water with electrode reactions.',
            'Convert: Ethene → Ethanol → Ethanoic acid (give reagents and conditions).'
        ],
        notationRequirements: [
            'Use proper chemical equations with states',
            'Include mole calculations',
            'Use electron dot structures',
            'Balance all reactions'
        ],
        avoidPatterns: [
            'Simple element identification',
            'Direct formula recall',
            'Questions without chemical reasoning'
        ]
    },
    biology: {
        board: 'icse',
        classLevel: 'class 10',
        subject: 'biology',
        expectedComplexity: 3.5,
        topics: [
            'Cell Division (mitosis, meiosis)',
            'Genetics (Mendelian inheritance)',
            'Human Nervous System',
            'Endocrine System',
            'Human Eye and Ear',
            'Circulatory System',
            'Excretion in Humans',
            'Reproductive System',
            'Population and the Environment',
            'Pollution and Conservation'
        ],
        sampleQuestionPatterns: [
            'Compare mitosis and meiosis with reference to chromosome behavior and significance.',
            'A pure tall plant (TT) is crossed with a pure dwarf plant (tt). Show the F1 and F2 generations with genotypes and phenotypes.',
            'Describe the structure of a neuron and explain the transmission of nerve impulse.',
            'Explain the role of ADH in osmoregulation and urine concentration.',
            'Draw a labeled diagram of the human eye and explain accommodation.'
        ],
        notationRequirements: [
            'Use genetic notation (TT, Tt, tt)',
            'Include Punnett squares',
            'Reference hormone names correctly',
            'Use proper anatomical terms'
        ],
        avoidPatterns: [
            'Simple organ naming',
            'Direct definition recall',
            'Questions without application or analysis'
        ]
    }
};

/**
 * ISC Class 12 Curriculum
 */
export const ISC_CLASS_12: Record<string, CurriculumStandard> = {
    mathematics: {
        board: 'icse',
        classLevel: 'class 12',
        subject: 'mathematics',
        expectedComplexity: 4.5,
        topics: [
            'Relations and Functions (types, inverse functions)',
            'Inverse Trigonometric Functions',
            'Matrices and Determinants',
            'Continuity and Differentiability',
            'Applications of Derivatives (maxima, minima, tangents)',
            'Integrals (definite, indefinite, applications)',
            'Differential Equations',
            'Vectors and 3D Geometry',
            'Linear Programming',
            'Probability (Bayes theorem, distributions)'
        ],
        sampleQuestionPatterns: [
            'If f(x) = (4x+3)/(6x-4), show that (fof)(x) = x for all x ≠ 2/3.',
            'Evaluate: ∫(x² + 1)/(x⁴ - x² + 1) dx',
            'Solve the differential equation: dy/dx + y/x = x³',
            'Find the shortest distance between the lines: r⃗ = î + ĵ + λ(2î - ĵ + k̂) and r⃗ = 2î + ĵ - k̂ + μ(3î - 5ĵ + 2k̂)',
            'A bag contains 4 red and 6 blue balls. Two balls are drawn at random. If the second ball is blue, find the probability that the first was also blue.',
            'Maximize Z = 3x + 2y subject to: x + 2y ≤ 10, 3x + y ≤ 15, x, y ≥ 0'
        ],
        notationRequirements: [
            'Use calculus notation: dy/dx, ∫, lim',
            'Use vector notation: î, ĵ, k̂, r⃗',
            'Use determinant notation with vertical bars',
            'Include conditional probability notation'
        ],
        avoidPatterns: [
            'Simple differentiation of polynomials',
            'Basic matrix operations',
            'Single-step integration',
            'Questions below Class 11 level'
        ]
    },
    physics: {
        board: 'icse',
        classLevel: 'class 12',
        subject: 'physics',
        expectedComplexity: 4.5,
        topics: [
            'Electrostatics (Coulomb\'s law, Gauss theorem)',
            'Current Electricity (Kirchhoff\'s laws, potentiometer)',
            'Magnetic Effects of Current (Biot-Savart, Ampere)',
            'Electromagnetic Induction',
            'Alternating Current (LCR circuits, resonance)',
            'Electromagnetic Waves',
            'Ray Optics (lenses, mirrors, optical instruments)',
            'Wave Optics (interference, diffraction, polarization)',
            'Dual Nature of Radiation',
            'Atoms and Nuclei',
            'Semiconductors and Electronics'
        ],
        sampleQuestionPatterns: [
            'Using Gauss\'s theorem, derive the electric field due to a uniformly charged infinite plane sheet.',
            'Derive the condition for balance in a Wheatstone bridge.',
            'A coil of 500 turns and area 10 cm² rotates in a magnetic field of 0.1 T. Calculate the maximum EMF if it rotates at 50 Hz.',
            'Explain Young\'s double slit experiment and derive the expression for fringe width.',
            'Calculate the de Broglie wavelength of an electron accelerated through 100V.'
        ],
        notationRequirements: [
            'Use proper electromagnetic notation',
            'Include vector analysis',
            'Show derivations step by step',
            'Include numerical calculations with units'
        ],
        avoidPatterns: [
            'Simple circuit calculations',
            'Direct formula application',
            'Questions without derivation or analysis'
        ]
    },
    chemistry: {
        board: 'icse',
        classLevel: 'class 12',
        subject: 'chemistry',
        expectedComplexity: 4.5,
        topics: [
            'Solid State (crystal structures, defects)',
            'Solutions (colligative properties)',
            'Electrochemistry (Nernst equation, cells)',
            'Chemical Kinetics',
            'Surface Chemistry (adsorption, colloids)',
            'd and f Block Elements',
            'Coordination Compounds',
            'Haloalkanes and Haloarenes',
            'Alcohols, Phenols, Ethers',
            'Aldehydes, Ketones, Carboxylic Acids',
            'Amines and Diazonium Compounds',
            'Biomolecules and Polymers'
        ],
        sampleQuestionPatterns: [
            'Calculate the packing efficiency in a face-centered cubic unit cell.',
            'The freezing point of a solution containing 0.5g of a substance in 25g of water is -0.186°C. Calculate the molar mass (Kf = 1.86 K kg/mol).',
            'For the reaction 2A → Products, the half-life is 20 min at [A]₀ = 0.1M and 40 min at [A]₀ = 0.2M. Find the order.',
            'Explain the mechanism of SN1 and SN2 reactions with examples.',
            'An organic compound C₃H₆O gives positive Tollens test and iodoform test. Identify and explain.'
        ],
        notationRequirements: [
            'Use proper chemical equations',
            'Include mechanism arrows',
            'Use stereochemistry notation',
            'Show reaction conditions'
        ],
        avoidPatterns: [
            'Simple naming reactions',
            'Direct formula application',
            'Questions without mechanism or calculation'
        ]
    },
    biology: {
        board: 'icse',
        classLevel: 'class 12',
        subject: 'biology',
        expectedComplexity: 4.5,
        topics: [
            'Sexual Reproduction in Flowering Plants',
            'Human Reproduction',
            'Principles of Inheritance and Variation',
            'Molecular Basis of Inheritance (DNA, RNA, gene expression)',
            'Evolution',
            'Human Health and Diseases',
            'Biotechnology: Principles and Processes',
            'Biotechnology Applications',
            'Organisms and Populations',
            'Ecosystem',
            'Biodiversity and Conservation',
            'Environmental Issues'
        ],
        sampleQuestionPatterns: [
            'Describe the process of double fertilization in angiosperms and its significance.',
            'Explain the molecular mechanism of transcription in eukaryotes.',
            'A cross between red (RR) and white (rr) flowers produces pink (Rr) flowers. Is this an exception to Mendel\'s law? Explain.',
            'Describe the steps involved in recombinant DNA technology for insulin production.',
            'Explain the energy flow in an ecosystem with the help of ecological pyramids.'
        ],
        notationRequirements: [
            'Use genetic notation correctly',
            'Include molecular biology terminology',
            'Reference specific enzymes and processes',
            'Use ecological terminology'
        ],
        avoidPatterns: [
            'Simple organism classification',
            'Direct definition recall',
            'Questions without application or analysis'
        ]
    }
};

/**
 * JEE/NEET Competitive Exam Standards
 */
export const JEE_STANDARDS: Record<string, Partial<CurriculumStandard>> = {
    mathematics: {
        examMode: 'jee',
        expectedComplexity: 5,
        sampleQuestionPatterns: [
            'If f(x) = [x] + {x}, where [.] and {.} denote greatest integer and fractional part functions, find the points of discontinuity in [0, 2].',
            'Evaluate: lim(n→∞) (1 + 1/n)ⁿ using calculus.',
            'Find the number of ways to arrange MISSISSIPPI such that no two I\'s are adjacent.',
            'If z₁, z₂, z₃ are vertices of an equilateral triangle inscribed in |z| = 2, find z₁ + z₂ + z₃.'
        ],
        avoidPatterns: [
            ...ICSE_CLASS_11.mathematics.avoidPatterns,
            'Single-step problems',
            'Direct formula application without conceptual twist',
            'Questions solvable without mathematical reasoning'
        ]
    },
    physics: {
        examMode: 'jee',
        expectedComplexity: 5,
        sampleQuestionPatterns: [
            'A particle moves such that its position vector r⃗ = a cos(ωt)î + b sin(ωt)ĵ. Find the velocity, acceleration, and show the path is an ellipse.',
            'Two blocks of masses m₁ and m₂ connected by a spring of constant k are released from rest with spring compressed by x₀. Find maximum velocities.',
            'Derive the expression for escape velocity from a planet of mass M and radius R. How does it change if planet\'s density doubles but radius halves?'
        ]
    }
};

export const NEET_STANDARDS: Record<string, Partial<CurriculumStandard>> = {
    biology: {
        examMode: 'neet',
        expectedComplexity: 5,
        sampleQuestionPatterns: [
            'Explain the regulation of blood glucose levels by insulin and glucagon with reference to negative feedback.',
            'Compare the mechanism of muscle contraction according to the sliding filament theory with the role of calcium ions.',
            'Describe the process of urine concentration in the collecting duct with reference to ADH and aquaporins.'
        ]
    },
    chemistry: {
        examMode: 'neet',
        expectedComplexity: 5,
        sampleQuestionPatterns: [
            'Explain the mechanism of nucleophilic substitution (SN1 vs SN2) with examples.',
            'Calculate the pH of a buffer solution containing 0.1M NH₄OH and 0.1M NH₄Cl (pKb = 4.75).',
            'Predict the products and mechanism of the reaction between 2-bromobutane and alcoholic KOH.'
        ]
    }
};

/**
 * Get curriculum standard for given parameters
 */
export function getCurriculumStandard(
    classLevel: string,
    subject: string,
    board: Board = 'icse',
    examMode?: ExamMode
): CurriculumStandard | null {
    const subjectKey = subject.toLowerCase();
    const classKey = classLevel?.toLowerCase() || '';

    // Select appropriate curriculum based on class level
    let curriculumData: Record<string, CurriculumStandard> | null = null;

    if (classKey.includes('9')) {
        curriculumData = ICSE_CLASS_9;
    } else if (classKey.includes('10')) {
        curriculumData = ICSE_CLASS_10;
    } else if (classKey.includes('11')) {
        curriculumData = ICSE_CLASS_11;
    } else if (classKey.includes('12')) {
        curriculumData = ISC_CLASS_12;
    }

    if (!curriculumData) {
        return null;
    }

    let standard = curriculumData[subjectKey];

    if (!standard) {
        return null;
    }

    // Apply exam mode enhancements (only for Class 11 and 12)
    if (classKey.includes('11') || classKey.includes('12')) {
        if (examMode === 'jee' && JEE_STANDARDS[subjectKey]) {
            standard = {
                ...standard,
                ...JEE_STANDARDS[subjectKey],
                sampleQuestionPatterns: [
                    ...standard.sampleQuestionPatterns,
                    ...(JEE_STANDARDS[subjectKey].sampleQuestionPatterns || [])
                ]
            };
        } else if (examMode === 'neet' && NEET_STANDARDS[subjectKey]) {
            standard = {
                ...standard,
                ...NEET_STANDARDS[subjectKey],
                sampleQuestionPatterns: [
                    ...standard.sampleQuestionPatterns,
                    ...(NEET_STANDARDS[subjectKey].sampleQuestionPatterns || [])
                ]
            };
        }
    }

    return standard;
}

/**
 * Generate curriculum enforcement prompt
 */
export function generateCurriculumPrompt(standard: CurriculumStandard): string {
    return `
**CURRICULUM STANDARDS (${standard.board.toUpperCase()} ${standard.classLevel.toUpperCase()})**

**VALID TOPICS FOR THIS CLASS** (Questions MUST relate to these):
${standard.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

**EXPECTED COMPLEXITY LEVEL**: ${standard.expectedComplexity}/5
- Questions must require ${standard.expectedComplexity >= 4 ? 'multi-step reasoning (3-5 steps minimum)' : 'conceptual understanding beyond recall'}
- Must test application and analysis, not just memorization

**NOTATION REQUIREMENTS**:
${standard.notationRequirements.map(n => `• ${n}`).join('\n')}

**EXAMPLE QUESTION PATTERNS** (Follow this complexity level):
${standard.sampleQuestionPatterns.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')}

**🚫 DO NOT GENERATE THESE TYPES** (Too simple for ${standard.classLevel}):
${standard.avoidPatterns.map(p => `❌ ${p}`).join('\n')}

**IMPORTANT**: If a question can be answered by a Class 8 student, it is TOO EASY. Regenerate with appropriate complexity.
`;
}
