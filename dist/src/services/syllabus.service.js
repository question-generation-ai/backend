"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyllabusService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
// Placeholder for ICSE syllabus data
const icseSyllabus = {
    'class 9': {
        'Mathematics': [
            { chapter: 'Pure Arithmetic', topics: ['Rational and Irrational Numbers'] },
            { chapter: 'Commercial Mathematics', topics: ['Compound Interest', 'Sales Tax and Value Added Tax'] },
            { chapter: 'Algebra', topics: ['Expansions', 'Factorisation', 'Simultaneous Linear Equations in Two Variables'] },
        ],
        'Physics': [
            { chapter: 'Measurements and Experimentation', topics: ['International System of Units', 'Simple Pendulum'] },
            { chapter: 'Motion in One Dimension', topics: ['Scalar and Vector Quantities', 'Equations of Motion'] },
        ],
        'Chemistry': [
            { chapter: 'The Language of Chemistry', topics: ['Symbols, Valency, and Radicals', 'Balancing of Chemical Equations'] },
            { chapter: 'Chemical Changes and Reactions', topics: ['Types of Chemical Changes', 'Reactivity Series'] },
        ],
        'Biology': [
            { chapter: 'Basic Biology', topics: ['The Cell', 'Tissues: Plant and Animal Tissues'] },
            { chapter: 'Flowering Plants', topics: ['Flower', 'Pollination and Fertilization'] },
        ],
        'History & Civics': [
            { chapter: 'Harappan Civilization', topics: ['Origin, Extent, Urban Planning', 'Trade, Art and Craft'] },
            { chapter: 'The Vedic Period', topics: ['Early and Later Vedic Period', 'Social and Economic Life'] },
        ],
        'Geography': [
            { chapter: 'Earth as a Planet', topics: ['Shape and Size of the Earth', 'Earth’s Movements and their Effects'] },
            { chapter: 'Structure of the Earth', topics: ['Core, Mantle, and Crust', 'Rocks'] },
        ],
        'English': [
            { chapter: 'Prose', topics: ['A Horse and Two Goats', 'Hearts and Hands'] },
            { chapter: 'Poetry', topics: ['The Bangle Sellers', 'After Blenheim'] },
        ],
    },
    'class 10': {
        'Mathematics': [
            { chapter: 'Commercial Mathematics', topics: ['Goods and Services Tax (GST)', 'Banking'] },
            { chapter: 'Algebra', topics: ['Linear Inequations', 'Quadratic Equations'] },
        ],
        'Physics': [
            { chapter: 'Force, Work, Power and Energy', topics: ['Contact and Non-contact Forces', 'Principle of Moments'] },
            { chapter: 'Light', topics: ['Refraction of Light', 'Total Internal Reflection'] },
        ],
        'Chemistry': [
            { chapter: 'Periodic Table, Periodic Properties and Variations of Properties', topics: ['Dobereiner’s Triads', 'Modern Periodic Table'] },
            { chapter: 'Chemical Bonding', topics: ['Electrovalent, Covalent and Coordinate Bonding', 'Structures of various compounds'] },
        ],
        'Biology': [
            { chapter: 'Basic Biology', topics: ['Cell Cycle and Cell Division', 'Structure of Chromosome'] },
            { chapter: 'Plant Physiology', topics: ['Absorption by Roots', 'Transpiration'] },
        ],
    },
    'class 11': {
        'Mathematics': [
            {
                chapter: 'Sets and Functions',
                topics: [
                    'Sets and their representations',
                    'Empty, Finite and Infinite sets',
                    'Subsets and Power set',
                    'Venn diagrams',
                    'Union and Intersection of sets',
                    'Difference and Complement of sets',
                    'Ordered pairs and Cartesian product',
                    'Relations - Domain, Co-domain and Range',
                    'Functions - Types and Mapping',
                    'Real valued functions',
                    'Graphs of functions',
                    'Trigonometric Functions',
                    'Positive and negative angles',
                    'Radians and degrees conversion',
                    'Trigonometric identities',
                    'Compound and multiple angles',
                    'Trigonometric equations',
                    'Properties of triangles - Sine and Cosine rules'
                ]
            },
            {
                chapter: 'Algebra',
                topics: [
                    'Principle of Mathematical Induction',
                    'Complex Numbers - Representation and properties',
                    'Argand plane and polar representation',
                    'Modulus, argument and conjugate',
                    'Square root and cube root of complex numbers',
                    'Triangle inequality',
                    'Quadratic Equations - Nature of roots',
                    'Sum and product of roots',
                    'Quadratic inequalities',
                    'Linear Inequalities',
                    'Graphical representation of inequalities',
                    'Permutations - Fundamental principle of counting',
                    'Restricted permutations',
                    'Circular permutations',
                    'Combinations and their properties',
                    'Binomial Theorem - Pascal\'s triangle',
                    'General and middle term in binomial expansion',
                    'Arithmetic Progression (A.P.)',
                    'Geometric Progression (G.P.)',
                    'Arithmetic and Geometric Mean',
                    'Arithmetico Geometric Series',
                    'Special sums of series'
                ]
            },
            {
                chapter: 'Coordinate Geometry',
                topics: [
                    'Shifting of origin',
                    'Slope of a line',
                    'Angle between two lines',
                    'Various forms of equations of a line',
                    'Point-slope form',
                    'Slope-intercept form',
                    'Two-point form',
                    'Intercept form',
                    'Normal form',
                    'General equation of a line',
                    'Distance of a point from a line',
                    'Distance between parallel lines',
                    'Angle bisectors',
                    'Family of lines',
                    'Circles - Standard form',
                    'Diameter form',
                    'General form',
                    'Parametric form',
                    'Tangents to circles',
                    'Condition for tangency'
                ]
            },
            {
                chapter: 'Calculus',
                topics: [
                    'Limits - Notion and meaning',
                    'Limits of algebraic functions',
                    'Limits of trigonometric functions',
                    'Limits of exponential and logarithmic functions',
                    'Indeterminate forms',
                    'Derivatives - Geometrical interpretation',
                    'Differentiation using first principles',
                    'Derivatives of algebraic functions',
                    'Derivatives of trigonometric functions',
                    'Derivatives of sum and difference',
                    'Derivatives of product of functions',
                    'Derivatives of quotient of functions'
                ]
            },
            {
                chapter: 'Statistics & Probability',
                topics: [
                    'Measures of dispersion - Range',
                    'Mean deviation',
                    'Variance and Standard deviation',
                    'Standard deviation - Direct method',
                    'Short cut method',
                    'Step deviation method',
                    'Mean, Median and Mode',
                    'Random experiments and outcomes',
                    'Sample spaces',
                    'Events - Types and properties',
                    'Mutually exclusive events',
                    'Exhaustive events',
                    'Probability of an event',
                    'Addition theorem of probability'
                ]
            },
            {
                chapter: 'Conic Section',
                topics: [
                    'Sections of a cone',
                    'Parabola - Standard equations',
                    'Focus, Directrix and Latus Rectum',
                    'Properties of parabola',
                    'Ellipse - Standard equations',
                    'Major and minor axis',
                    'Focal property of ellipse',
                    'Hyperbola - Standard equations',
                    'Transverse and Conjugate axes',
                    'Focal property of hyperbola',
                    'General second-degree equation',
                    'Condition for pair of straight lines',
                    'Tangents to conics'
                ]
            },
            {
                chapter: 'Introduction to Three-dimensional Geometry',
                topics: [
                    'Coordinate axes in three dimensions',
                    'Coordinate planes',
                    'Coordinates of a point in space',
                    'Distance between two points',
                    'Section formula',
                    'Midpoint formula'
                ]
            },
            {
                chapter: 'Mathematical Reasoning',
                topics: [
                    'Mathematically acceptable statements',
                    'If and only if conditions',
                    'Implies and implied by',
                    'Logical connectives - And, Or',
                    'There exists',
                    'Contradiction',
                    'Converse',
                    'Contrapositive',
                    'Validating statements'
                ]
            },
            {
                chapter: 'Statistics',
                topics: [
                    'Combined mean',
                    'Combined standard deviation',
                    'Median of grouped data',
                    'Quartiles',
                    'Deciles',
                    'Percentiles',
                    'Mode of grouped and ungrouped data'
                ]
            },
            {
                chapter: 'Correlation Analysis',
                topics: [
                    'Covariance - Definition and meaning',
                    'Karl Pearson\'s Coefficient of Correlation',
                    'Correlation with assumed means',
                    'Spearman\'s Rank Correlation',
                    'Rank correlation with correction for ties'
                ]
            },
            {
                chapter: 'Index Numbers and Moving Averages',
                topics: [
                    'Price index and price relative',
                    'Simple aggregate method',
                    'Weighted aggregate method',
                    'Simple average of price relatives',
                    'Weighted average of price relatives',
                    'Cost of living index',
                    'Consumer price index',
                    'Moving averages - Meaning and purpose',
                    'Calculation of moving averages',
                    'Centered moving averages',
                    'Plotting moving averages'
                ]
            }
        ],
        'Physics': [
            {
                chapter: 'Physical World and Measurement',
                topics: [
                    'Scope of Physics and its applications',
                    'Nature of physical laws',
                    'Fundamental forces in nature',
                    'Units and systems of units',
                    'SI base units and their definitions',
                    'Derived units and their symbols',
                    'Accuracy and precision of measurements',
                    'Errors in measurement',
                    'Significant figures',
                    'Dimensional formulae and analysis',
                    'Applications of dimensional analysis'
                ]
            },
            {
                chapter: 'Kinematics',
                topics: [
                    'Frame of reference',
                    'Position-time graph',
                    'Speed and velocity',
                    'Average and instantaneous velocity',
                    'Acceleration',
                    'Velocity-time and acceleration-time graphs',
                    'Equations of uniformly accelerated motion',
                    'Motion under gravity',
                    'Scalar and vector quantities',
                    'Position and displacement vectors',
                    'Addition and subtraction of vectors',
                    'Unit vectors and resolution',
                    'Scalar product of vectors',
                    'Vector product of vectors',
                    'Relative velocity',
                    'Projectile motion',
                    'Uniform circular motion'
                ]
            },
            {
                chapter: 'Laws of Motion',
                topics: [
                    'Newton\'s first law of motion',
                    'Inertia and mass',
                    'Newton\'s second law of motion',
                    'Momentum and impulse',
                    'Newton\'s third law of motion',
                    'Conservation of linear momentum',
                    'Equilibrium of concurrent forces',
                    'Free body diagrams',
                    'Static and kinetic friction',
                    'Laws of friction',
                    'Angle of friction and repose',
                    'Motion on inclined plane',
                    'Angular displacement and velocity',
                    'Centripetal acceleration',
                    'Centripetal force',
                    'Motion in vertical circle',
                    'Banking of roads'
                ]
            },
            {
                chapter: 'Work, Energy and Power',
                topics: [
                    'Work done by constant force',
                    'Work done by variable force',
                    'Kinetic energy',
                    'Work-energy theorem',
                    'Potential energy',
                    'Potential energy of a spring',
                    'Conservative and non-conservative forces',
                    'Conservation of mechanical energy',
                    'Power',
                    'Elastic collisions in one dimension',
                    'Inelastic collisions',
                    'Collisions in two dimensions'
                ]
            },
            {
                chapter: 'Motion of System of Particles and Rigid Body',
                topics: [
                    'Centre of mass of two-particle system',
                    'Centre of mass of rigid body',
                    'Motion of centre of mass',
                    'Moment of a force and torque',
                    'Angular momentum',
                    'Conservation of angular momentum',
                    'Equilibrium of rigid bodies',
                    'Moment of inertia',
                    'Radius of gyration',
                    'Moments of inertia for simple objects',
                    'Parallel and perpendicular axes theorems',
                    'Rotational motion equations',
                    'Comparison of linear and rotational motions'
                ]
            },
            {
                chapter: 'Gravitation',
                topics: [
                    'Kepler\'s laws of planetary motion',
                    'Universal law of gravitation',
                    'Gravitational constant G',
                    'Acceleration due to gravity',
                    'Variation of g with altitude',
                    'Variation of g with depth',
                    'Variation of g with latitude',
                    'Gravitational field and intensity',
                    'Gravitational potential',
                    'Gravitational potential energy',
                    'Escape velocity',
                    'Orbital velocity of satellite',
                    'Time period of satellite',
                    'Geostationary satellites',
                    'Weightlessness',
                    'Polar satellites'
                ]
            },
            {
                chapter: 'Properties of Bulk Matter',
                topics: [
                    'Elasticity in solids',
                    'Stress and strain',
                    'Hooke\'s law',
                    'Young\'s modulus',
                    'Bulk modulus',
                    'Shear modulus of rigidity',
                    'Poisson\'s ratio',
                    'Elastic energy',
                    'Pressure in fluids',
                    'Pascal\'s law',
                    'Hydraulic machines',
                    'Archimedes principle',
                    'Equation of continuity',
                    'Bernoulli\'s theorem',
                    'Applications of Bernoulli\'s theorem',
                    'Streamline and turbulent flow',
                    'Critical velocity and Reynolds number',
                    'Viscosity',
                    'Coefficient of viscosity',
                    'Poiseuille\'s formula',
                    'Stokes\' law',
                    'Terminal velocity',
                    'Surface tension',
                    'Surface energy',
                    'Angle of contact',
                    'Excess pressure in drops and bubbles',
                    'Capillary rise'
                ]
            },
            {
                chapter: 'Heat and Thermodynamics',
                topics: [
                    'Temperature and heat',
                    'Temperature scales',
                    'Thermal expansion of solids',
                    'Thermal expansion of liquids',
                    'Thermal expansion of gases',
                    'Anomalous expansion of water',
                    'Specific heat capacity',
                    'Calorimetry',
                    'Change of state',
                    'Latent heat capacity',
                    'Heat transfer - Conduction',
                    'Thermal conductivity',
                    'Heat transfer - Convection',
                    'Heat transfer - Radiation',
                    'Black body radiation',
                    'Wien\'s displacement law',
                    'Stefan-Boltzmann law',
                    'Newton\'s law of cooling',
                    'Greenhouse effect',
                    'Zeroth law of thermodynamics',
                    'Internal energy',
                    'First law of thermodynamics',
                    'Isothermal process',
                    'Adiabatic process',
                    'Work done in thermodynamic processes',
                    'Specific heat capacities Cp and Cv',
                    'Relation between Cp and Cv',
                    'Second law of thermodynamics',
                    'Reversible and irreversible processes',
                    'Carnot\'s cycle',
                    'Efficiency of heat engine',
                    'Refrigerators and heat pumps'
                ]
            },
            {
                chapter: 'Behaviour of Perfect Gases and Kinetic Theory of Gases',
                topics: [
                    'Equation of state of perfect gas',
                    'Assumptions of kinetic theory',
                    'Pressure from kinetic theory',
                    'rms speed of gas molecules',
                    'Kinetic interpretation of temperature',
                    'Degrees of freedom',
                    'Law of equipartition of energy',
                    'Specific heat capacities of gases',
                    'Mean free path',
                    'Avogadro\'s number'
                ]
            },
            {
                chapter: 'Oscillations and Waves',
                topics: [
                    'Periodic motion',
                    'Time period and frequency',
                    'Simple harmonic motion (SHM)',
                    'Displacement in SHM',
                    'Velocity and acceleration in SHM',
                    'Phase and epoch',
                    'Differential equation of SHM',
                    'Energy in SHM',
                    'Simple pendulum',
                    'Spring oscillations',
                    'Free oscillations',
                    'Damped oscillations',
                    'Forced oscillations',
                    'Resonance',
                    'Wave motion',
                    'Transverse and longitudinal waves',
                    'Speed of wave motion',
                    'Displacement relation for progressive wave',
                    'Principle of superposition',
                    'Reflection of waves',
                    'Standing waves',
                    'Vibrations of stretched string',
                    'Vibrations in organ pipes',
                    'Fundamental mode and harmonics',
                    'Speed of sound',
                    'Beats',
                    'Doppler effect'
                ]
            }
        ],
        'Chemistry': [
            {
                chapter: 'Some Basic Concepts of Chemistry',
                topics: [
                    'Laws of chemical combination',
                    'Dalton\'s atomic theory',
                    'Atomic and molecular mass',
                    'Mole concept and Avogadro\'s number',
                    'Percentage composition',
                    'Empirical and molecular formula',
                    'Equivalent weight and normality',
                    'Stoichiometry calculations',
                    'Limiting reagent'
                ]
            },
            {
                chapter: 'Structure of Atom',
                topics: [
                    'Discovery of subatomic particles',
                    'Atomic number, isotopes and isobars',
                    'Thomson\'s and Rutherford\'s model',
                    'Electromagnetic spectrum and Planck\'s quantum theory',
                    'Bohr\'s atomic model',
                    'de Broglie\'s equation',
                    'Heisenberg\'s uncertainty principle',
                    'Quantum numbers',
                    'Shapes of orbitals',
                    'Aufbau principle, Pauli\'s exclusion principle',
                    'Hund\'s rule',
                    'Electronic configuration'
                ]
            },
            {
                chapter: 'Classification of Elements and Periodicity in Properties',
                topics: [
                    'Mendeleev\'s periodic law',
                    'Modern periodic law',
                    'Long form of periodic table',
                    'Atomic and ionic radii',
                    'Ionisation enthalpy',
                    'Electron gain enthalpy',
                    'Electronegativity',
                    'Periodic trends in properties',
                    'Diagonal relationship'
                ]
            },
            {
                chapter: 'Chemical Bonding and Molecular Structure',
                topics: [
                    'Kossel-Lewis approach',
                    'Ionic bond and lattice energy',
                    'Born-Haber cycle',
                    'Covalent bond and Lewis structures',
                    'Sigma and pi bonds',
                    'Polar and non-polar bonds',
                    'Dipole moment',
                    'Octet rule and its exceptions',
                    'Fajan\'s rules',
                    'VSEPR theory',
                    'Hybridisation',
                    'Molecular orbital theory',
                    'Bond order',
                    'Coordinate bond',
                    'Resonance',
                    'Hydrogen bonding'
                ]
            },
            {
                chapter: 'States of Matter: Gases and Liquids',
                topics: [
                    'Intermolecular forces',
                    'Gas laws - Boyle\'s, Charles\', Avogadro\'s',
                    'Ideal gas equation',
                    'Dalton\'s law of partial pressures',
                    'Graham\'s law of diffusion',
                    'Kinetic theory of gases',
                    'van der Waals equation',
                    'Liquefaction of gases',
                    'Liquid state - vapour pressure, viscosity, surface tension'
                ]
            },
            {
                chapter: 'Chemical Thermodynamics',
                topics: [
                    'System and surroundings',
                    'Intensive and extensive properties',
                    'First law of thermodynamics',
                    'Internal energy and enthalpy',
                    'Heat capacity',
                    'Hess\'s law',
                    'Enthalpy of formation, combustion, atomisation',
                    'Second law of thermodynamics',
                    'Entropy',
                    'Gibbs free energy',
                    'Spontaneity of reactions'
                ]
            },
            {
                chapter: 'Equilibrium',
                topics: [
                    'Chemical equilibrium',
                    'Law of mass action',
                    'Equilibrium constant Kc and Kp',
                    'Le Chatelier\'s principle',
                    'Ionic equilibrium',
                    'Ostwald\'s dilution law',
                    'Arrhenius, Bronsted-Lowry, Lewis concepts',
                    'pH, pOH and pKw',
                    'Buffer solutions',
                    'Henderson equation',
                    'Common ion effect',
                    'Salt hydrolysis',
                    'Solubility product'
                ]
            },
            {
                chapter: 'Redox Reactions',
                topics: [
                    'Oxidation and reduction',
                    'Oxidation number',
                    'Balancing redox reactions',
                    'Oxidation number method',
                    'Ion-electron method'
                ]
            },
            {
                chapter: 'Hydrogen',
                topics: [
                    'Position of hydrogen in periodic table',
                    'Isotopes of hydrogen',
                    'Preparation and properties of hydrogen',
                    'Hydrides',
                    'Water and heavy water',
                    'Hydrogen peroxide - preparation and properties',
                    'Strength of hydrogen peroxide'
                ]
            },
            {
                chapter: 's-Block Elements',
                topics: [
                    'Alkali metals - properties and trends',
                    'Alkaline earth metals - properties and trends',
                    'Sodium hydroxide, sodium carbonate',
                    'Sodium bicarbonate, sodium thiosulphate',
                    'Calcium oxide, calcium hydroxide',
                    'Plaster of Paris and cement'
                ]
            },
            {
                chapter: 'Some p-Block Elements',
                topics: [
                    'Group 13 - Boron family',
                    'Borax, boric acid, diborane',
                    'Aluminium - amphoteric nature',
                    'Group 14 - Carbon family',
                    'Allotropes of carbon',
                    'Oxides of carbon and silicon',
                    'Silicon carbide, silicones, silicates'
                ]
            },
            {
                chapter: 'Organic Chemistry - Basic Principles',
                topics: [
                    'Classification of organic compounds',
                    'IUPAC nomenclature',
                    'Structural isomerism',
                    'Stereoisomerism',
                    'Geometrical isomerism',
                    'Optical isomerism',
                    'Detection of elements',
                    'Estimation of elements',
                    'Inductive effect, electromeric effect',
                    'Resonance and hyperconjugation',
                    'Homolytic and heterolytic fission',
                    'Electrophiles and nucleophiles',
                    'SN1, SN2, E1, E2 mechanisms'
                ]
            },
            {
                chapter: 'Hydrocarbons',
                topics: [
                    'Alkanes - preparation and properties',
                    'Free radical halogenation',
                    'Conformations of ethane',
                    'Alkenes - preparation and properties',
                    'Markownikoff\'s rule',
                    'Saytzeff\'s rule',
                    'Electrophilic addition',
                    'Alkynes - preparation and properties',
                    'Acidic nature of alkynes',
                    'Benzene - structure and aromaticity',
                    'Electrophilic substitution in benzene',
                    'Friedel-Crafts reaction',
                    'Directive influence of substituents'
                ]
            },
            {
                chapter: 'Environmental Chemistry',
                topics: [
                    'Air pollution',
                    'Water pollution',
                    'Soil pollution',
                    'Greenhouse effect and global warming',
                    'Ozone depletion',
                    'Acid rain',
                    'Green chemistry'
                ]
            }
        ],
        'Biology': [
            {
                chapter: 'Diversity of Living Organisms',
                topics: [
                    'Characteristics of living organisms',
                    'Three domains of life',
                    'Taxonomy and systematics',
                    'Binomial nomenclature',
                    'Five kingdom classification',
                    'Kingdom Monera - Bacteria',
                    'Kingdom Protista',
                    'Kingdom Fungi',
                    'Viruses and Viroids',
                    'Algae - Chlorophyceae, Phaeophyceae, Rhodophyceae',
                    'Bryophyta',
                    'Pteridophyta',
                    'Gymnosperms',
                    'Angiosperms',
                    'Animal Kingdom - Body plans and symmetry',
                    'Non-chordata phyla',
                    'Chordata classification'
                ]
            },
            {
                chapter: 'Structural Organisation in Animals and Plants',
                topics: [
                    'Morphology of root, stem, leaf',
                    'Modifications of roots and stems',
                    'Structure of flower',
                    'Types of inflorescence',
                    'Meristematic and permanent tissues',
                    'Anatomy of root, stem and leaf',
                    'Secondary growth in dicot',
                    'Animal tissues - Epithelial, connective, muscular, nervous',
                    'Cockroach morphology and anatomy'
                ]
            },
            {
                chapter: 'Cell: Structure and Function',
                topics: [
                    'Cell theory',
                    'Prokaryotic and eukaryotic cells',
                    'Cell membrane - Fluid mosaic model',
                    'Cell wall and plasmodesmata',
                    'Cell organelles',
                    'Endomembrane system',
                    'Mitochondria and plastids',
                    'Nucleus and chromosomes',
                    'Carbohydrates classification',
                    'Proteins and amino acids',
                    'Lipids',
                    'Enzymes',
                    'Cell cycle',
                    'Mitosis',
                    'Meiosis'
                ]
            },
            {
                chapter: 'Plant Physiology',
                topics: [
                    'Diffusion, osmosis and plasmolysis',
                    'Water potential',
                    'Imbibition',
                    'Transport in plants',
                    'Transpiration',
                    'Stomatal mechanism',
                    'Root pressure and guttation',
                    'Mineral nutrition',
                    'Nitrogen fixation and nitrogen cycle',
                    'Photosynthesis - Light and dark reactions',
                    'Cyclic and non-cyclic photophosphorylation',
                    'C3 and C4 pathways',
                    'Photorespiration',
                    'Respiration - Glycolysis, Krebs cycle, ETS',
                    'Respiratory quotient',
                    'Plant growth regulators',
                    'Photoperiodism and vernalisation'
                ]
            },
            {
                chapter: 'Human Physiology',
                topics: [
                    'Digestive system and enzymes',
                    'Digestion and absorption',
                    'Nutritional disorders',
                    'Respiratory system',
                    'Mechanism of breathing',
                    'Transport of gases',
                    'Respiratory volumes',
                    'Blood composition',
                    'Blood groups - ABO and Rh factor',
                    'Blood clotting',
                    'Structure of heart',
                    'Cardiac cycle',
                    'ECG and blood pressure',
                    'Lymphatic system',
                    'Excretory system',
                    'Nephron structure and function',
                    'Urine formation',
                    'Regulation of kidney function',
                    'Human skeleton',
                    'Types of joints',
                    'Muscle contraction',
                    'Nervous system',
                    'Neuron structure',
                    'Nerve impulse conduction',
                    'Reflex action',
                    'Structure of eye and ear',
                    'Endocrine glands and hormones',
                    'Hormone mechanism of action',
                    'Hypo and hyper secretion disorders'
                ]
            }
        ],
    },
    'class 12': {
        'Biology': [
            {
                chapter: 'Reproduction',
                topics: [
                    'Structure of flower and gametophytes',
                    'Pollination types and agencies',
                    'Double fertilization',
                    'Seed and fruit formation',
                    'Apomixis, parthenocarpy, polyembryony',
                    'Male and female reproductive systems',
                    'Spermatogenesis and oogenesis',
                    'Menstrual cycle',
                    'Fertilization and implantation',
                    'Pregnancy and placenta',
                    'Reproductive health',
                    'Contraceptive methods',
                    'Sexually transmitted diseases',
                    'Infertility and ART'
                ]
            },
            {
                chapter: 'Genetics and Evolution',
                topics: [
                    'Mendelian inheritance',
                    'Incomplete dominance and co-dominance',
                    'Multiple alleles and blood groups',
                    'Polygenic inheritance',
                    'Sex determination and sex-linked inheritance',
                    'Linkage and crossing over',
                    'Mutation',
                    'Chromosomal disorders',
                    'DNA and RNA structure',
                    'DNA replication',
                    'Transcription and translation',
                    'Genetic code',
                    'Gene expression and lac operon',
                    'Human Genome Project',
                    'DNA fingerprinting',
                    'Origin of life theories',
                    'Evidences of evolution',
                    'Darwin\'s theory and natural selection',
                    'Hardy-Weinberg principle',
                    'Human evolution'
                ]
            },
            {
                chapter: 'Biology and Human Welfare',
                topics: [
                    'Pathogens and diseases',
                    'Immunity - Innate and acquired',
                    'Vaccines and immunization',
                    'Cancer',
                    'AIDS',
                    'Drug and alcohol abuse',
                    'Microbes in household products',
                    'Antibiotics',
                    'Sewage treatment',
                    'Biogas production',
                    'Biocontrol agents',
                    'Biofertilizers'
                ]
            },
            {
                chapter: 'Biotechnology and its Applications',
                topics: [
                    'Recombinant DNA technology',
                    'Restriction enzymes and ligase',
                    'Cloning vectors',
                    'Gene transfer methods',
                    'PCR technique',
                    'Genetically modified crops',
                    'Bt crops',
                    'Transgenic animals',
                    'Gene therapy',
                    'Stem cell technology',
                    'Biosafety and bioethics'
                ]
            },
            {
                chapter: 'Ecology and Environment',
                topics: [
                    'Population attributes',
                    'Population growth models',
                    'Population interactions',
                    'Ecosystem structure and function',
                    'Energy flow and food chains',
                    'Ecological pyramids',
                    'Productivity and decomposition',
                    'Biodiversity',
                    'Biodiversity conservation',
                    'Hotspots and protected areas',
                    'Threatened and endangered species'
                ]
            }
        ],
        'Chemistry': [
            {
                chapter: 'Solutions',
                topics: [
                    'Concentration units',
                    'Solubility of gases - Henry\'s law',
                    'Raoult\'s law',
                    'Ideal and non-ideal solutions',
                    'Colligative properties',
                    'Osmotic pressure',
                    'van\'t Hoff factor',
                    'Abnormal molecular mass'
                ]
            },
            {
                chapter: 'Electrochemistry',
                topics: [
                    'Electrochemical cells',
                    'Electrode potential',
                    'Nernst equation',
                    'Conductance in electrolytes',
                    'Kohlrausch\'s law',
                    'Faraday\'s laws of electrolysis',
                    'Batteries and fuel cells',
                    'Corrosion'
                ]
            },
            {
                chapter: 'Chemical Kinetics',
                topics: [
                    'Rate of reaction',
                    'Factors affecting reaction rate',
                    'Order and molecularity',
                    'Rate law',
                    'First order reactions',
                    'Half-life',
                    'Collision theory',
                    'Activation energy',
                    'Arrhenius equation'
                ]
            },
            {
                chapter: 'd- and f-Block Elements',
                topics: [
                    'Transition metals properties',
                    'Oxidation states',
                    'Coloured compounds',
                    'Catalytic properties',
                    'Lanthanoids and actinoids',
                    'Lanthanoid contraction',
                    'Potassium permanganate',
                    'Potassium dichromate'
                ]
            },
            {
                chapter: 'Coordination Compounds',
                topics: [
                    'Ligands and coordination number',
                    'IUPAC nomenclature',
                    'Isomerism in coordination compounds',
                    'Werner\'s theory',
                    'Valence Bond Theory',
                    'Crystal Field Theory',
                    'Colour and magnetic properties'
                ]
            },
            {
                chapter: 'Haloalkanes and Haloarenes',
                topics: [
                    'Nomenclature and classification',
                    'Preparation of haloalkanes',
                    'SN1 and SN2 mechanisms',
                    'Elimination reactions',
                    'Preparation of haloarenes',
                    'Electrophilic substitution in haloarenes',
                    'Uses of halocompounds'
                ]
            },
            {
                chapter: 'Alcohols, Phenols and Ethers',
                topics: [
                    'Classification of alcohols',
                    'Preparation of alcohols',
                    'Reactions of alcohols',
                    'Lucas test',
                    'Preparation of phenols',
                    'Acidic nature of phenols',
                    'Reactions of phenols',
                    'Preparation and reactions of ethers'
                ]
            },
            {
                chapter: 'Aldehydes, Ketones and Carboxylic Acids',
                topics: [
                    'Preparation of aldehydes and ketones',
                    'Nucleophilic addition reactions',
                    'Aldol condensation',
                    'Cannizzaro reaction',
                    'Oxidation and reduction',
                    'Preparation of carboxylic acids',
                    'Acidic nature of carboxylic acids',
                    'Reactions of carboxylic acids'
                ]
            },
            {
                chapter: 'Organic Compounds containing Nitrogen',
                topics: [
                    'Classification of amines',
                    'Preparation of amines',
                    'Basic character of amines',
                    'Reactions of amines',
                    'Diazonium salts',
                    'Sandmeyer and Gattermann reactions',
                    'Cyanides and isocyanides'
                ]
            },
            {
                chapter: 'Biomolecules',
                topics: [
                    'Carbohydrates classification',
                    'Glucose and fructose structures',
                    'Disaccharides and polysaccharides',
                    'Proteins and amino acids',
                    'Structure of proteins',
                    'Enzymes',
                    'Vitamins',
                    'Nucleic acids - DNA and RNA'
                ]
            }
        ],
        'Physics': [
            {
                chapter: 'Electrostatics',
                topics: [
                    'Coulomb\'s law',
                    'Electric field and field lines',
                    'Electric dipole',
                    'Gauss\'s theorem',
                    'Electric potential and potential energy',
                    'Equipotential surfaces',
                    'Capacitance',
                    'Combination of capacitors',
                    'Energy stored in capacitor',
                    'Dielectrics'
                ]
            },
            {
                chapter: 'Current Electricity',
                topics: [
                    'Electric current and drift velocity',
                    'Ohm\'s law',
                    'Resistance and resistivity',
                    'Temperature dependence',
                    'Internal resistance of cell',
                    'Combination of cells',
                    'Kirchhoff\'s laws',
                    'Wheatstone bridge',
                    'Metre bridge',
                    'Potentiometer'
                ]
            },
            {
                chapter: 'Magnetic Effects of Current and Magnetism',
                topics: [
                    'Biot-Savart law',
                    'Ampere\'s circuital law',
                    'Force on moving charge',
                    'Force on current-carrying conductor',
                    'Torque on current loop',
                    'Moving coil galvanometer',
                    'Magnetic dipole',
                    'Diamagnetic, paramagnetic, ferromagnetic',
                    'Electromagnets'
                ]
            },
            {
                chapter: 'Electromagnetic Induction and AC',
                topics: [
                    'Faraday\'s laws',
                    'Lenz\'s law',
                    'Self and mutual induction',
                    'Transformer',
                    'AC generator',
                    'RMS and peak values',
                    'LCR circuits',
                    'Resonance',
                    'Power in AC circuits'
                ]
            },
            {
                chapter: 'Electromagnetic Waves',
                topics: [
                    'Displacement current',
                    'Electromagnetic spectrum',
                    'Properties of EM waves'
                ]
            },
            {
                chapter: 'Optics',
                topics: [
                    'Reflection by spherical mirrors',
                    'Refraction at plane surfaces',
                    'Total internal reflection',
                    'Refraction through prism',
                    'Refraction at spherical surfaces',
                    'Lens formula and lens maker\'s formula',
                    'Combination of lenses',
                    'Optical instruments',
                    'Huygen\'s principle',
                    'Interference - Young\'s double slit',
                    'Diffraction at single slit'
                ]
            },
            {
                chapter: 'Dual Nature of Radiation and Matter',
                topics: [
                    'Photoelectric effect',
                    'Einstein\'s photoelectric equation',
                    'Matter waves',
                    'de Broglie relation',
                    'Davisson-Germer experiment'
                ]
            },
            {
                chapter: 'Atoms and Nuclei',
                topics: [
                    'Rutherford\'s atomic model',
                    'Bohr\'s atomic model',
                    'Hydrogen spectrum',
                    'Nuclear composition',
                    'Mass defect and binding energy',
                    'Nuclear fission and fusion',
                    'Nuclear reactor'
                ]
            },
            {
                chapter: 'Electronic Devices',
                topics: [
                    'Energy bands',
                    'Intrinsic and extrinsic semiconductors',
                    'p-n junction diode',
                    'Diode as rectifier',
                    'Zener diode',
                    'LED and photodiode',
                    'Solar cell'
                ]
            }
        ]
    }
};
class SyllabusService {
    static async getSyllabus(classLevel) {
        logger_1.default.info(`Fetching syllabus for class: ${classLevel}`);
        // @ts-ignore
        const syllabus = icseSyllabus[classLevel.toLowerCase()];
        if (!syllabus) {
            throw new Error(`Syllabus not found for class: ${classLevel}`);
        }
        return syllabus;
    }
    static async getSubjects(classLevel) {
        logger_1.default.info(`Fetching subjects for class: ${classLevel}`);
        // @ts-ignore
        const syllabus = icseSyllabus[classLevel.toLowerCase()];
        if (!syllabus) {
            throw new Error(`Syllabus not found for class: ${classLevel}`);
        }
        return Object.keys(syllabus);
    }
    static async getTopics(classLevel, subject) {
        logger_1.default.info(`Fetching topics for class: ${classLevel}, subject: ${subject}`);
        // @ts-ignore
        const syllabus = icseSyllabus[classLevel.toLowerCase()];
        if (!syllabus || !syllabus[subject]) {
            throw new Error(`Syllabus not found for class: ${classLevel} and subject: ${subject}`);
        }
        return syllabus[subject];
    }
}
exports.SyllabusService = SyllabusService;
