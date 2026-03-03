const ValidationPageRedesign = () => {
  // Initial state - no data loaded until search/filter applied
  const [hasSearched, setHasSearched] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedLabUnit, setSelectedLabUnit] = React.useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  
  // Advanced filters
  const [filters, setFilters] = React.useState({
    labNumberFrom: '',
    labNumberTo: '',
    dateFrom: '',
    dateTo: '',
    testSection: '',
    analyzer: '',
    enteredBy: '',
    showFlaggedOnly: false,
    showNormalOnly: false,
    showAbnormalOnly: false,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [totalResults, setTotalResults] = React.useState(0);
  
  // UI state
  const [expandedRow, setExpandedRow] = React.useState(null);
  const [selectedTab, setSelectedTab] = React.useState('method');
  const [selectedResults, setSelectedResults] = React.useState(new Set());
  const [showRetestModal, setShowRetestModal] = React.useState(false);
  const [retestReason, setRetestReason] = React.useState('');
  const [retestTargets, setRetestTargets] = React.useState([]);
  
  // Editing state (validator unlock)
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [selectedMethod, setSelectedMethod] = React.useState('analyzer');
  const [selectedAnalyzer, setSelectedAnalyzer] = React.useState(null);
  const [selectedReagentLots, setSelectedReagentLots] = React.useState({});
  const [methodNotes, setMethodNotes] = React.useState('');
  const [selectedInterpretation, setSelectedInterpretation] = React.useState(null);
  const [interpretationText, setInterpretationText] = React.useState('');
  const [showNoteInput, setShowNoteInput] = React.useState(false);
  const [noteType, setNoteType] = React.useState('internal');
  const [noteText, setNoteText] = React.useState('');
  
  // Available analyzers for tests
  const availableAnalyzers = [
    { id: 'sysmex-xn', name: 'Sysmex XN-L', status: 'online', lastCalibrated: '12/18/2025 06:00', qcStatus: 'pass' },
    { id: 'sysmex-xs', name: 'Sysmex XS-1000i', status: 'online', lastCalibrated: '12/18/2025 05:45', qcStatus: 'pass' },
    { id: 'cobas-c501', name: 'Cobas c 501', status: 'online', lastCalibrated: '12/18/2025 06:30', qcStatus: 'pass' },
  ];

  // Available reagent lots (sorted by FIFO - oldest first)
  const availableReagents = [
    { 
      id: 'reagent-1',
      name: 'Cellpack DCL', 
      lots: [
        { lotNumber: 'LOT-2024-0892', received: '10/15/2024', expires: '12/20/2024', remaining: '15%', fifoRank: 1, status: 'expiring-soon' },
        { lotNumber: 'LOT-2024-1234', received: '11/01/2024', expires: '01/15/2025', remaining: '85%', fifoRank: 2, status: 'ok' },
      ]
    },
    { 
      id: 'reagent-2',
      name: 'Lysercell WNR', 
      lots: [
        { lotNumber: 'LOT-2024-5678', received: '11/10/2024', expires: '12/25/2024', remaining: '45%', fifoRank: 1, status: 'expiring-soon' },
        { lotNumber: 'LOT-2024-6012', received: '12/05/2024', expires: '02/15/2025', remaining: '100%', fifoRank: 2, status: 'ok' },
      ]
    },
  ];

  // Macro codes for method notes
  const macroCodes = {
    'MAN-HEM': 'Manual count performed using hemocytometer with improved Neubauer chamber.',
    'MAN-RECOUNT': 'Result verified by manual recount.',
    'QNS': 'Quantity not sufficient for automated analysis.',
    'CLOT': 'Sample contained clots, manual method required.',
    'LIPEMIC': 'Lipemic sample, manual verification performed.',
    'HEMOLYZED': 'Hemolyzed sample, result may be affected.',
  };

  // Interpretation codes
  const interpretationCodes = {
    'WBC-NL': 'White blood cell count within normal limits. No evidence of infection or hematologic abnormality.',
    'WBC-LEUK': 'Elevated WBC count. May indicate infection, inflammation, stress response, or hematologic disorder.',
    'WBC-LEUKP': 'Decreased WBC count. May indicate bone marrow suppression, viral infection, or autoimmune condition.',
    'GLU-NL': 'Fasting glucose within normal limits. No evidence of glucose metabolism disorder.',
    'GLU-IFG': 'Fasting glucose in prediabetic range. Recommend lifestyle modifications and periodic monitoring.',
    'GLU-DM': 'Fasting glucose â‰¥126 mg/dL is consistent with diabetes mellitus. Recommend confirmation.',
  };

  // Handle macro expansion in method notes
  const handleMethodNotesChange = (e) => {
    let value = e.target.value;
    if (value.endsWith(' ')) {
      const words = value.trimEnd().split(' ');
      const lastWord = words[words.length - 1].toUpperCase();
      if (macroCodes[lastWord]) {
        words[words.length - 1] = macroCodes[lastWord];
        value = words.join(' ') + ' ';
      }
    }
    setMethodNotes(value);
  };

  // Handle macro expansion in interpretation text
  const handleInterpretationTextChange = (e) => {
    let value = e.target.value;
    if (value.endsWith(' ')) {
      const words = value.trimEnd().split(' ');
      const lastWord = words[words.length - 1].toUpperCase();
      if (interpretationCodes[lastWord]) {
        words[words.length - 1] = interpretationCodes[lastWord];
        value = words.join(' ') + ' ';
        setSelectedInterpretation(lastWord);
      }
    }
    setInterpretationText(value);
  };

  // Get lot status style
  const getLotStatusStyle = (status, isFifo) => {
    if (status === 'expiring-soon') return 'border-amber-300 bg-amber-50';
    if (status === 'expired') return 'border-red-300 bg-red-50 opacity-50';
    if (isFifo) return 'border-teal-300 bg-teal-50';
    return 'border-gray-200 bg-white';
  };
  
  // Lab units for dropdown
  const labUnits = [
    { id: 'hematology', name: 'Hematology' },
    { id: 'chemistry', name: 'Chemistry' },
    { id: 'microbiology', name: 'Microbiology' },
    { id: 'immunology', name: 'Immunology' },
    { id: 'urinalysis', name: 'Urinalysis' },
    { id: 'bloodbank', name: 'Blood Bank' },
  ];
  
  // Test sections for filter dropdown
  const testSections = [
    'Complete Blood Count',
    'Basic Metabolic Panel',
    'Lipid Panel',
    'Liver Function',
    'Thyroid Panel',
    'Coagulation',
  ];
  
  // Analyzers for filter dropdown
  const analyzers = [
    'Sysmex XN-L',
    'Sysmex XS-1000i',
    'Cobas c 501',
    'Cobas e 411',
    'Manual',
  ];
  
  // Users for filter dropdown
  const users = [
    'J. Smith',
    'M. Johnson',
    'K. Davis',
    'A. Williams',
  ];

  // Icons
  const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
  const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
  const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
  const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
  const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
  const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
  const MoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>;
  const CpuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>;
  const TrendingUp = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
  const TrendingDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>;
  const AlertTriangle = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
  const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>;
  const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
  const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
  const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
  const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  const AlertCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;
  const RotateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
  const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>;
  const RefreshCwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>;
  const CheckSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
  const SquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>;
  const MinusSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/></svg>;
  const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
  const ClipboardListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>;
  const FlaskIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.58 16.5h12.85"/></svg>;
  const BeakerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/></svg>;
  const MessageSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
  const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
  const UnlockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;
  const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
  const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
  const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;

  // All results data (would come from API in real implementation)
  const allResults = [
    {
      id: 1,
      labNumber: 'DEV01250000000000',
      patient: { name: 'Test, Patient', id: '3456789', dob: '01/11/2011', sex: 'M', age: '14y' },
      testDate: '12/18/2025',
      testName: 'White Blood Cells Count (WBC)',
      sampleType: 'Whole Blood',
      normalRange: '4.00 - 10.00',
      unit: 'x10^9/L',
      result: '7.5',
      status: 'awaiting-validation',
      enteredBy: { name: 'J. Smith', date: '12/18/2025 10:30' },
      method: 'analyzer',
      analyzer: 'Sysmex XN-L',
      flags: [],
      isNormal: true,
      previousResults: [
        { date: '12/01/2025', value: '6.8', status: 'normal' },
        { date: '11/15/2025', value: '7.2', status: 'normal' },
      ],
      notes: [
        { id: 1, date: '12/18/2025 09:45', author: 'J. Smith', type: 'internal', body: 'Sample hemolyzed, may need redraw.' },
      ],
      attachments: [
        { id: 1, name: 'Requisition_Form.pdf', type: 'pdf', size: '245 KB', uploadedBy: 'Order Entry', uploadedAt: '12/18/2025 08:00', source: 'order' },
        { id: 2, name: 'Blood_Smear_Image.jpg', type: 'image', size: '1.2 MB', uploadedBy: 'J. Smith', uploadedAt: '12/18/2025 10:15', source: 'result' },
      ],
      orderInfo: {
        clinician: 'Dr. Sarah Williams',
        clinicianPhone: '+1 555-0123',
        department: 'Internal Medicine',
        priority: 'Routine',
        collectionDate: '12/18/2025 08:30',
        receivedDate: '12/18/2025 09:00',
        clinicalHistory: 'Annual checkup, patient reports fatigue',
        diagnosis: 'R53.83 - Other fatigue',
        fastingStatus: 'Non-fasting',
        medicationList: 'Warfarin 5mg daily, Lisinopril 10mg daily',
      },
      interpretation: { code: 'WBC-NL', label: 'Normal', text: 'White blood cell count within normal limits. No evidence of infection or hematologic abnormality.' },
      interpretationOptions: [
        { code: 'WBC-NL', label: 'Normal', color: 'green', range: '4.00-10.00', text: 'White blood cell count within normal limits. No evidence of infection or hematologic abnormality.' },
        { code: 'WBC-LEUK', label: 'Leukocytosis', color: 'orange', range: '>10.00', text: 'Elevated WBC count. May indicate infection, inflammation, stress response, or hematologic disorder.' },
        { code: 'WBC-LEUKP', label: 'Leukopenia', color: 'yellow', range: '<4.00', text: 'Decreased WBC count. May indicate bone marrow suppression, viral infection, or autoimmune condition.' },
      ],
      qcStatus: 'pass',
      qcData: [
        { level: 'Level 1 (Low)', expected: '3.5', actual: '3.6', status: 'pass', cv: '2.9%' },
        { level: 'Level 2 (Normal)', expected: '7.0', actual: '7.1', status: 'pass', cv: '1.4%' },
        { level: 'Level 3 (High)', expected: '15.0', actual: '14.8', status: 'pass', cv: '1.3%' },
      ],
      reagentLots: [
        { name: 'Cellpack DCL', lot: 'LOT-2024-0892', expires: '12/20/2024', status: 'expiring-soon' },
        { name: 'Lysercell WNR', lot: 'LOT-2024-5678', expires: '12/25/2024', status: 'expiring-soon' },
      ],
    },
    {
      id: 2,
      labNumber: 'DEV01250000000000',
      patient: { name: 'Test, Patient', id: '3456789', dob: '01/11/2011', sex: 'M', age: '14y' },
      testDate: '12/18/2025',
      testName: 'Red Blood Cells Count (RBC)',
      sampleType: 'Whole Blood',
      normalRange: '4.50 - 6.00',
      unit: 'x10^12/L',
      result: '4.2',
      status: 'awaiting-validation',
      enteredBy: { name: 'J. Smith', date: '12/18/2025 10:30' },
      method: 'analyzer',
      analyzer: 'Sysmex XN-L',
      flags: ['below-normal'],
      isNormal: false,
      previousResults: [{ date: '12/01/2025', value: '4.8', status: 'normal' }],
      notes: [],
      attachments: [],
      orderInfo: {
        clinician: 'Dr. Sarah Williams',
        clinicianPhone: '+1 555-0123',
        department: 'Internal Medicine',
        priority: 'Routine',
        collectionDate: '12/18/2025 08:30',
        receivedDate: '12/18/2025 09:00',
      },
      interpretation: { code: 'RBC-ANEMOD', label: 'Mild Anemia', text: 'RBC count slightly below reference range. Suggests mild anemia. Recommend correlation with hemoglobin, hematocrit, and reticulocyte count.' },
      interpretationOptions: [
        { code: 'RBC-NL', label: 'Normal', color: 'green', range: '4.50-6.00', text: 'Red blood cell count within normal limits.' },
        { code: 'RBC-ANEMOD', label: 'Mild Anemia', color: 'yellow', range: '3.50-4.49', text: 'RBC count slightly below reference range. Suggests mild anemia.' },
        { code: 'RBC-POLY', label: 'Polycythemia', color: 'orange', range: '>6.00', text: 'Elevated RBC count. May indicate polycythemia vera or secondary polycythemia.' },
      ],
      qcStatus: 'pass',
      qcData: [
        { level: 'Level 1 (Low)', expected: '3.8', actual: '3.9', status: 'pass', cv: '2.6%' },
        { level: 'Level 2 (Normal)', expected: '5.0', actual: '5.1', status: 'pass', cv: '2.0%' },
      ],
      reagentLots: [
        { name: 'Cellpack DCL', lot: 'LOT-2024-0892', expires: '12/20/2024', status: 'expiring-soon' },
      ],
    },
    {
      id: 3,
      labNumber: 'DEV01250000000001',
      patient: { name: 'Smith, Jane', id: '7891234', dob: '05/22/1985', sex: 'F', age: '39y' },
      testDate: '12/18/2025',
      testName: 'Glucose, Fasting',
      sampleType: 'Serum',
      normalRange: '70 - 99',
      unit: 'mg/dL',
      result: '142',
      status: 'awaiting-validation',
      enteredBy: { name: 'M. Johnson', date: '12/18/2025 11:15' },
      method: 'analyzer',
      analyzer: 'Cobas c 501',
      flags: ['above-normal', 'delta-check'],
      isNormal: false,
      previousResults: [{ date: '12/01/2025', value: '98', status: 'normal' }],
      notes: [
        { id: 1, date: '12/18/2025 11:30', author: 'K. Davis', type: 'external', body: 'Patient confirmed 12-hour fast prior to collection.' },
      ],
      interpretation: { code: 'GLU-DM', label: 'Diabetes Mellitus', text: 'Fasting glucose â‰¥126 mg/dL is consistent with diabetes mellitus. Recommend confirmation with repeat fasting glucose or HbA1c.' },
      qcStatus: 'pass',
      qcData: [
        { level: 'Level 1 (Low)', expected: '65', actual: '64', status: 'pass', cv: '1.5%' },
        { level: 'Level 2 (Normal)', expected: '100', actual: '101', status: 'pass', cv: '1.0%' },
        { level: 'Level 3 (High)', expected: '250', actual: '248', status: 'pass', cv: '0.8%' },
      ],
      reagentLots: [
        { name: 'Glucose Reagent', lot: 'LOT-2024-GLU-123', expires: '03/15/2025', status: 'ok' },
      ],
      deltaCheck: { previous: '98', change: '+44.9%', threshold: '20%' },
    },
    {
      id: 4,
      labNumber: 'DEV01250000000002',
      patient: { name: 'Johnson, Robert', id: '4567890', dob: '11/03/1970', sex: 'M', age: '55y' },
      testDate: '12/18/2025',
      testName: 'Hemoglobin (HGB)',
      sampleType: 'Whole Blood',
      normalRange: '13.5 - 17.5',
      unit: 'g/dL',
      result: '14.8',
      status: 'awaiting-validation',
      enteredBy: { name: 'J. Smith', date: '12/18/2025 10:45' },
      method: 'analyzer',
      analyzer: 'Sysmex XN-L',
      flags: [],
      isNormal: true,
      previousResults: [{ date: '11/20/2025', value: '14.5', status: 'normal' }],
      notes: [],
      interpretation: { code: 'HGB-NL', label: 'Normal', text: 'Hemoglobin within normal limits.' },
      qcStatus: 'pass',
      qcData: [
        { level: 'Level 1 (Low)', expected: '10.0', actual: '10.1', status: 'pass', cv: '1.0%' },
        { level: 'Level 2 (Normal)', expected: '14.0', actual: '14.1', status: 'pass', cv: '0.7%' },
      ],
      reagentLots: [
        { name: 'Cellpack DCL', lot: 'LOT-2024-0892', expires: '12/20/2024', status: 'expiring-soon' },
      ],
    },
    {
      id: 5,
      labNumber: 'DEV01250000000002',
      patient: { name: 'Johnson, Robert', id: '4567890', dob: '11/03/1970', sex: 'M', age: '55y' },
      testDate: '12/18/2025',
      testName: 'Hematocrit (HCT)',
      sampleType: 'Whole Blood',
      normalRange: '38.0 - 50.0',
      unit: '%',
      result: '44.2',
      status: 'awaiting-validation',
      enteredBy: { name: 'J. Smith', date: '12/18/2025 10:45' },
      method: 'analyzer',
      analyzer: 'Sysmex XN-L',
      flags: [],
      isNormal: true,
      previousResults: [{ date: '11/20/2025', value: '43.8', status: 'normal' }],
      notes: [],
      interpretation: { code: 'HCT-NL', label: 'Normal', text: 'Hematocrit within normal limits.' },
      qcStatus: 'pass',
      qcData: [
        { level: 'Level 1 (Low)', expected: '30.0', actual: '30.2', status: 'pass', cv: '0.7%' },
        { level: 'Level 2 (Normal)', expected: '42.0', actual: '42.1', status: 'pass', cv: '0.2%' },
      ],
      reagentLots: [
        { name: 'Cellpack DCL', lot: 'LOT-2024-0892', expires: '12/20/2024', status: 'expiring-soon' },
      ],
    },
    {
      id: 6,
      labNumber: 'DEV01250000000003',
      patient: { name: 'Williams, Maria', id: '9012345', dob: '08/15/1992', sex: 'F', age: '33y' },
      testDate: '12/18/2025',
      testName: 'Platelet Count (PLT)',
      sampleType: 'Whole Blood',
      normalRange: '150 - 400',
      unit: 'x10^9/L',
      result: '95',
      status: 'awaiting-validation',
      enteredBy: { name: 'K. Davis', date: '12/18/2025 11:00' },
      method: 'manual',
      methodNotes: 'Manual count performed using hemocytometer with improved Neubauer chamber. Result verified by manual recount.',
      analyzer: null,
      flags: ['below-normal', 'critical'],
      isNormal: false,
      previousResults: [{ date: '12/10/2025', value: '145', status: 'low-normal' }],
      notes: [
        { id: 1, date: '12/18/2025 11:05', author: 'K. Davis', type: 'internal', body: 'Clumping noted on smear. Manual count performed to verify.' },
      ],
      interpretation: { code: 'PLT-LOW', label: 'Thrombocytopenia', text: 'Platelet count below normal range. Verify no clumping. Consider repeat with sodium citrate tube if EDTA-induced.' },
      qcStatus: 'pass',
      qcData: [],
      reagentLots: [],
    },
  ];

  // State for displayed results (filtered from allResults)
  const [displayedResults, setDisplayedResults] = React.useState([]);

  // Simulate search/filter function
  const performSearch = () => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      let filtered = [...allResults];
      
      // Apply search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(r => 
          r.labNumber.toLowerCase().includes(q) ||
          r.patient.id.toLowerCase().includes(q) ||
          r.patient.name.toLowerCase().includes(q) ||
          r.testName.toLowerCase().includes(q)
        );
      }
      
      // Apply lab unit filter (simulated - in real app would filter by lab unit)
      if (selectedLabUnit) {
        // For demo, filter by test type based on lab unit
        if (selectedLabUnit === 'hematology') {
          filtered = filtered.filter(r => 
            r.testName.includes('WBC') || r.testName.includes('RBC') || 
            r.testName.includes('Hemoglobin') || r.testName.includes('Hematocrit') ||
            r.testName.includes('Platelet')
          );
        } else if (selectedLabUnit === 'chemistry') {
          filtered = filtered.filter(r => r.testName.includes('Glucose'));
        }
      }
      
      // Apply advanced filters
      if (filters.analyzer) {
        filtered = filtered.filter(r => r.analyzer === filters.analyzer || (filters.analyzer === 'Manual' && r.method === 'manual'));
      }
      if (filters.enteredBy) {
        filtered = filtered.filter(r => r.enteredBy.name === filters.enteredBy);
      }
      if (filters.showFlaggedOnly) {
        filtered = filtered.filter(r => r.flags.length > 0);
      }
      if (filters.showNormalOnly) {
        filtered = filtered.filter(r => r.isNormal);
      }
      if (filters.showAbnormalOnly) {
        filtered = filtered.filter(r => !r.isNormal);
      }
      
      setTotalResults(filtered.length);
      setDisplayedResults(filtered);
      setHasSearched(true);
      setIsLoading(false);
      setCurrentPage(1);
      setSelectedResults(new Set());
    }, 500);
  };

  // Handle search submit
  const handleSearch = (e) => {
    e?.preventDefault();
    if (searchQuery || selectedLabUnit) {
      performSearch();
    }
  };

  // Handle lab unit change
  const handleLabUnitChange = (value) => {
    setSelectedLabUnit(value);
    if (value) {
      // Auto-search when lab unit selected
      setTimeout(() => performSearch(), 100);
    }
  };

  // Clear all filters and reset
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLabUnit('');
    setFilters({
      labNumberFrom: '',
      labNumberTo: '',
      dateFrom: '',
      dateTo: '',
      testSection: '',
      analyzer: '',
      enteredBy: '',
      showFlaggedOnly: false,
      showNormalOnly: false,
      showAbnormalOnly: false,
    });
    setHasSearched(false);
    setDisplayedResults([]);
    setTotalResults(0);
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalResults / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalResults);
  const paginatedResults = displayedResults.slice(startIndex, endIndex);

  // Calculate counts from displayed results
  const normalResults = displayedResults.filter(r => r.isNormal);
  const abnormalResults = displayedResults.filter(r => !r.isNormal);
  const flaggedResults = displayedResults.filter(r => r.flags.length > 0);

  // Selection helpers - work on paginated results
  const allSelected = selectedResults.size === paginatedResults.length && paginatedResults.length > 0;
  const someSelected = selectedResults.size > 0 && selectedResults.size < paginatedResults.length;
  const noneSelected = selectedResults.size === 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(paginatedResults.map(r => r.id)));
    }
  };

  const selectNormal = () => {
    const normalOnPage = paginatedResults.filter(r => r.isNormal);
    setSelectedResults(new Set(normalOnPage.map(r => r.id)));
  };

  const selectAllNormal = () => {
    setSelectedResults(new Set(normalResults.map(r => r.id)));
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResults(newSelected);
  };

  const handleAcceptSelected = () => {
    // In real implementation, this would call the API
    alert(`Validating and releasing ${selectedResults.size} result(s)`);
    setSelectedResults(new Set());
  };

  const handleRetestSelected = () => {
    setRetestTargets([...selectedResults]);
    setShowRetestModal(true);
  };

  const confirmRetest = () => {
    if (!retestReason.trim()) {
      alert('Retest reason is required');
      return;
    }
    // In real implementation, this would call the API
    alert(`Sending ${retestTargets.length} result(s) back for retest.\nReason: ${retestReason}`);
    setShowRetestModal(false);
    setRetestReason('');
    setRetestTargets([]);
    setSelectedResults(new Set());
  };

  const getFlagIcon = (flag) => {
    switch (flag) {
      case 'above-normal': return <span className="text-orange-500" title="Above Normal"><TrendingUp /></span>;
      case 'below-normal': return <span className="text-yellow-600" title="Below Normal"><TrendingDown /></span>;
      case 'delta-check': return <span className="text-red-500" title="Delta Check Alert"><AlertTriangle /></span>;
      case 'critical': return <span className="text-red-600" title="Critical Value"><AlertCircleIcon /></span>;
      default: return null;
    }
  };

  const getInterpretationColor = (color) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800 border-green-300';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'red': return 'bg-red-100 text-red-800 border-red-300';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheckIcon /> Result Validation
            </h1>
            <p className="text-sm text-gray-500 mt-1">Review and validate results before release</p>
          </div>
          {hasSearched && (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{totalResults}</span> results found
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Search and Filter Bar */}
        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-4">
            {/* Lab Unit Dropdown */}
            <div className="w-48">
              <select
                value={selectedLabUnit}
                onChange={(e) => handleLabUnitChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Select Lab Unit...</option>
                {labUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </div>
            
            <span className="text-gray-400">or</span>
            
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search by lab number, patient ID, or test name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            {/* Search Button */}
            <button 
              type="submit"
              disabled={!searchQuery && !selectedLabUnit}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchQuery || selectedLabUnit
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Search
            </button>
            
            {/* Filter Toggle */}
            <button 
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showAdvancedFilters 
                  ? 'bg-teal-50 border-teal-300 text-teal-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              <FilterIcon /> Filters
            </button>
            
            {hasSearched && (
              <button 
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-4 gap-4">
                {/* Lab Number Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lab Number From</label>
                  <input
                    type="text"
                    value={filters.labNumberFrom}
                    onChange={(e) => setFilters({...filters, labNumberFrom: e.target.value})}
                    placeholder="e.g., DEV0125000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lab Number To</label>
                  <input
                    type="text"
                    value={filters.labNumberTo}
                    onChange={(e) => setFilters({...filters, labNumberTo: e.target.value})}
                    placeholder="e.g., DEV0125999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                
                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                
                {/* Test Section */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Test Section</label>
                  <select
                    value={filters.testSection}
                    onChange={(e) => setFilters({...filters, testSection: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Sections</option>
                    {testSections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                
                {/* Analyzer */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Analyzer</label>
                  <select
                    value={filters.analyzer}
                    onChange={(e) => setFilters({...filters, analyzer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Analyzers</option>
                    {analyzers.map(analyzer => (
                      <option key={analyzer} value={analyzer}>{analyzer}</option>
                    ))}
                  </select>
                </div>
                
                {/* Entered By */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Entered By</label>
                  <select
                    value={filters.enteredBy}
                    onChange={(e) => setFilters({...filters, enteredBy: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
                
                {/* Quick Filters */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quick Filters</label>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.showFlaggedOnly}
                        onChange={(e) => setFilters({...filters, showFlaggedOnly: e.target.checked, showNormalOnly: false, showAbnormalOnly: false})}
                        className="rounded border-gray-300 text-teal-600"
                      />
                      Flagged
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.showNormalOnly}
                        onChange={(e) => setFilters({...filters, showNormalOnly: e.target.checked, showFlaggedOnly: false, showAbnormalOnly: false})}
                        className="rounded border-gray-300 text-teal-600"
                      />
                      Normal
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.showAbnormalOnly}
                        onChange={(e) => setFilters({...filters, showAbnormalOnly: e.target.checked, showFlaggedOnly: false, showNormalOnly: false})}
                        className="rounded border-gray-300 text-teal-600"
                      />
                      Abnormal
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={performSearch}
                  disabled={!searchQuery && !selectedLabUnit}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    searchQuery || selectedLabUnit
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Initial State - Before Search */}
        {!hasSearched && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <SearchIcon />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search to View Results</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Select a lab unit from the dropdown or enter a search term to view results awaiting validation.
              This helps ensure only relevant data is loaded.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading results...</p>
          </div>
        )}

        {/* Results View - After Search */}
        {hasSearched && !isLoading && (
          <>
            {/* Quick Stats */}
            <div className="flex items-center gap-2 text-sm mb-4">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">{normalResults.length} Normal</span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">{abnormalResults.length} Abnormal</span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded">{flaggedResults.length} Flagged</span>
            </div>

        {/* Batch Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Select All Checkbox */}
              <button 
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                {allSelected ? (
                  <span className="text-teal-600"><CheckSquareIcon /></span>
                ) : someSelected ? (
                  <span className="text-teal-600"><MinusSquareIcon /></span>
                ) : (
                  <span className="text-gray-400"><SquareIcon /></span>
                )}
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>

              <div className="h-6 border-l border-gray-300" />

              {/* Select Normal */}
              <button 
                onClick={selectNormal}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <CheckCircleIcon />
                Select Normal ({normalResults.length})
              </button>

              <div className="h-6 border-l border-gray-300" />

              {/* Selection Count */}
              <span className="text-sm text-gray-500">
                {selectedResults.size > 0 ? (
                  <span className="text-teal-700 font-medium">{selectedResults.size} selected</span>
                ) : (
                  'None selected'
                )}
              </span>
            </div>

            {/* Batch Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetestSelected}
                disabled={noneSelected}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  noneSelected
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                <RefreshCwIcon />
                Retest Selected
              </button>
              <button
                onClick={handleAcceptSelected}
                disabled={noneSelected}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  noneSelected
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                <CheckIcon />
                Accept & Release Selected
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        {paginatedResults.length > 0 ? (
        <div className="space-y-2">
          {paginatedResults.map((result) => (
            <div key={result.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Collapsed Row */}
              <div 
                className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedResults.has(result.id) ? 'bg-teal-50' : ''
                }`}
              >
                {/* Checkbox */}
                <div 
                  onClick={(e) => { e.stopPropagation(); toggleSelect(result.id); }}
                  className="mr-3 cursor-pointer"
                >
                  {selectedResults.has(result.id) ? (
                    <span className="text-teal-600"><CheckSquareIcon /></span>
                  ) : (
                    <span className="text-gray-400 hover:text-gray-600"><SquareIcon /></span>
                  )}
                </div>

                {/* Expand/Collapse */}
                <div 
                  onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}
                  className="mr-3 text-gray-400"
                >
                  {expandedRow === result.id ? <ChevronDown /> : <ChevronRight />}
                </div>

                {/* QC Status Indicator */}
                <div className="mr-3">
                  <div className={`w-3 h-3 rounded-full ${
                    result.qcStatus === 'pass' ? 'bg-green-500' : 'bg-red-500'
                  }`} title={`QC ${result.qcStatus}`} />
                </div>

                {/* Sample Info */}
                <div className="w-48 mr-4" onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}>
                  <div className="text-sm font-medium text-gray-900">{result.labNumber}</div>
                  <div className="text-xs text-gray-500">
                    {result.patient.id} â€¢ {result.patient.sex}/{result.patient.age}
                  </div>
                </div>

                {/* Test Name */}
                <div className="flex-1 mr-4" onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}>
                  <div className="text-sm font-medium text-gray-900">{result.testName}</div>
                  <div className="text-xs text-gray-500">{result.sampleType}</div>
                </div>

                {/* Method/Analyzer */}
                <div className="w-32 mr-4 text-xs text-gray-500" onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}>
                  {result.method === 'manual' ? (
                    <span className="text-blue-600">Manual</span>
                  ) : (
                    <span>{result.analyzer}</span>
                  )}
                </div>

                {/* Range */}
                <div className="w-28 text-xs text-gray-500 mr-4" onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}>
                  {result.normalRange} {result.unit}
                </div>

                {/* Result Display */}
                <div className="w-24 mr-4" onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}>
                  <div className={`text-lg font-semibold ${
                    result.isNormal ? 'text-gray-900' : 'text-amber-600'
                  }`}>
                    {result.result}
                  </div>
                </div>

                {/* Flags */}
                <div className="w-20 flex items-center gap-1 mr-4" onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}>
                  {result.flags.map((flag, idx) => (
                    <span key={idx}>{getFlagIcon(flag)}</span>
                  ))}
                </div>

                {/* Entered By */}
                <div className="w-32 text-xs text-gray-500 mr-4" onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}>
                  <div className="flex items-center gap-1">
                    <UserIcon />
                    <span>{result.enteredBy.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <ClockIcon />
                    <span>{result.enteredBy.date}</span>
                  </div>
                </div>

                {/* Row Actions */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => {
                      setRetestTargets([result.id]);
                      setShowRetestModal(true);
                    }}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                    title="Retest"
                  >
                    <RefreshCwIcon />
                  </button>
                  <button 
                    onClick={() => alert(`Validating and releasing result ${result.id}`)}
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                    title="Accept & Release"
                  >
                    <CheckIcon />
                  </button>
                </div>
              </div>

              {/* Expanded Panel */}
              {expandedRow === result.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  {/* Patient Details (visible when expanded) */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-blue-900">{result.patient.name}</span>
                        <span className="text-sm text-blue-700 ml-3">DOB: {result.patient.dob}</span>
                        <span className="text-sm text-blue-700 ml-3">ID: {result.patient.id}</span>
                      </div>
                      <div className="text-sm text-blue-600">
                        {result.patient.sex} / {result.patient.age}
                      </div>
                    </div>
                  </div>

                  {/* Entry Info Banner with Unlock Button */}
                  <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <UserIcon />
                          <span className="text-gray-600">Entered by:</span>
                          <span className="font-medium text-gray-900">{result.enteredBy.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon />
                          <span className="text-gray-600">at</span>
                          <span className="font-medium text-gray-900">{result.enteredBy.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Method:</span>
                          {result.method === 'manual' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Manual</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium">{result.analyzer}</span>
                          )}
                        </div>
                        {/* Unlock/Lock Toggle */}
                        <button
                          onClick={() => setIsUnlocked(!isUnlocked)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isUnlocked
                              ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
                              : 'bg-gray-200 text-gray-600 border border-gray-300 hover:bg-gray-300'
                          }`}
                        >
                          {isUnlocked ? <UnlockIcon /> : <LockIcon />}
                          {isUnlocked ? 'Editing Enabled' : 'Unlock to Edit'}
                        </button>
                      </div>
                    </div>
                    {result.methodNotes && (
                      <div className="mt-2 text-xs text-gray-600 italic border-t border-gray-200 pt-2">
                        {result.methodNotes}
                      </div>
                    )}
                  </div>

                  {/* Result and Interpretation - Editable when unlocked */}
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    {/* Result Value */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Result Value</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          defaultValue={result.result}
                          disabled={!isUnlocked}
                          className={`text-2xl font-bold w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                            result.isNormal 
                              ? 'border-gray-300 text-gray-900' 
                              : 'border-amber-300 text-amber-700 bg-amber-50'
                          } ${!isUnlocked ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        />
                        <span className="text-gray-500">{result.unit}</span>
                        <span className="text-sm text-gray-400">Range: {result.normalRange}</span>
                      </div>
                      {result.deltaCheck && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                          <AlertTriangle /> Delta Check: {result.deltaCheck.change} from previous ({result.deltaCheck.previous}) - exceeds {result.deltaCheck.threshold} threshold
                        </div>
                      )}
                    </div>

                    {/* Interpretation - Editable when unlocked */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Interpretation</label>
                        {isUnlocked && (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <EditIcon /> Click to change
                          </span>
                        )}
                      </div>
                      {!isUnlocked ? (
                        // Read-only view
                        result.interpretation && (
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                              result.isNormal 
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {result.interpretation.label}
                            </span>
                            <p className="mt-2 text-sm text-gray-600">{result.interpretation.text}</p>
                          </div>
                        )
                      ) : (
                        // Editable view
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {result.interpretationOptions?.map((opt) => (
                              <button
                                key={opt.code}
                                onClick={() => {
                                  setSelectedInterpretation(opt.code);
                                  setInterpretationText(opt.text);
                                }}
                                className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                  (selectedInterpretation || result.interpretation?.code) === opt.code
                                    ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-500'
                                    : opt.color === 'green' ? 'bg-green-50 text-green-700 border-green-200 hover:border-green-400'
                                    : opt.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:border-yellow-400'
                                    : opt.color === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            rows={2}
                            value={interpretationText || result.interpretation?.text || ''}
                            onChange={handleInterpretationTextChange}
                            placeholder="Type interpretation or use a code (e.g., WBC-NL)..."
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Section - Always visible, can add when unlocked */}
                  <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <MessageSquareIcon /> Notes ({result.notes.length})
                      </h4>
                      {isUnlocked && (
                        <button
                          onClick={() => setShowNoteInput(!showNoteInput)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                        >
                          <PlusIcon /> Add Note
                        </button>
                      )}
                    </div>
                    
                    {/* Add Note Input */}
                    {showNoteInput && isUnlocked && (
                      <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <label className="text-xs font-medium text-gray-600">Note Type:</label>
                          <label className="flex items-center gap-1.5 text-sm">
                            <input
                              type="radio"
                              name="noteType"
                              value="internal"
                              checked={noteType === 'internal'}
                              onChange={() => setNoteType('internal')}
                              className="text-teal-600"
                            />
                            <span className="text-amber-700">Internal QA - No Results Release</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-sm">
                            <input
                              type="radio"
                              name="noteType"
                              value="external"
                              checked={noteType === 'external'}
                              onChange={() => setNoteType('external')}
                              className="text-teal-600"
                            />
                            <span className="text-gray-700">External (Visible on Report)</span>
                          </label>
                        </div>
                        <textarea
                          rows={2}
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Enter note..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => { setShowNoteInput(false); setNoteText(''); }}
                            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              alert(`Adding ${noteType} note: ${noteText}`);
                              setShowNoteInput(false);
                              setNoteText('');
                            }}
                            disabled={!noteText.trim()}
                            className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                          >
                            Add Note
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Existing Notes */}
                    {result.notes.length > 0 ? (
                      <div className="space-y-2">
                        {result.notes.map((note) => (
                          <div key={note.id} className={`p-2 rounded text-sm ${
                            note.type === 'internal' 
                              ? 'bg-amber-50 border border-amber-200' 
                              : 'bg-gray-50 border border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-700">{note.author}</span>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {note.type === 'internal' && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Internal QA</span>
                                )}
                                <span>{note.date}</span>
                              </div>
                            </div>
                            <p className="text-gray-600">{note.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic text-center py-2">
                        No notes added
                      </div>
                    )}
                  </div>

                  {/* Tabs - Extended with Order Info, Attachments, Notes */}
                  <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
                    {[
                      { id: 'method', label: 'Method & Reagents', icon: <FlaskIcon /> },
                      { id: 'orderinfo', label: 'Order Info', icon: <ClipboardListIcon /> },
                      { id: 'attachments', label: `Attachments (${result.attachments?.length || 0})`, icon: <PaperclipIcon /> },
                      { id: 'history', label: 'History', icon: <HistoryIcon /> },
                      { id: 'qc', label: 'QA/QC', icon: <CheckCircleIcon /> },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          selectedTab === tab.id
                            ? 'border-teal-500 text-teal-700 bg-teal-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[200px]">
                    {/* Method & Reagents Tab - Editable when unlocked */}
                    {selectedTab === 'method' && (
                      <div className="grid grid-cols-2 gap-6">
                        {/* Method Selection */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <CpuIcon /> Method {isUnlocked && <span className="text-xs text-amber-600">(Editable)</span>}
                          </h4>
                          
                          {!isUnlocked ? (
                            // Read-only view
                            <div className="p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {result.method === 'manual' ? 'Manual' : result.analyzer}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {result.method === 'manual' ? 'Manual entry' : 'Automated analyzer'}
                                  </div>
                                </div>
                                {result.method === 'analyzer' && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Online</span>
                                )}
                              </div>
                              {result.methodNotes && (
                                <div className="mt-2 text-xs text-gray-600 border-t border-gray-100 pt-2">
                                  {result.methodNotes}
                                </div>
                              )}
                            </div>
                          ) : (
                            // Editable view
                            <div className="space-y-3">
                              {/* Method Type Selection */}
                              <div className="space-y-2">
                                <label className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                  selectedMethod === 'manual'
                                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <input type="radio" name="methodType" value="manual"
                                      checked={selectedMethod === 'manual'}
                                      onChange={() => { setSelectedMethod('manual'); setSelectedAnalyzer(null); }}
                                      className="text-teal-600 focus:ring-teal-500" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">Manual</div>
                                      <div className="text-xs text-gray-500">Manual entry without analyzer</div>
                                    </div>
                                  </div>
                                </label>

                                <label className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                  selectedMethod === 'analyzer'
                                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <input type="radio" name="methodType" value="analyzer"
                                      checked={selectedMethod === 'analyzer'}
                                      onChange={() => setSelectedMethod('analyzer')}
                                      className="text-teal-600 focus:ring-teal-500" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">Analyzer</div>
                                      <div className="text-xs text-gray-500">Result from automated analyzer</div>
                                    </div>
                                  </div>
                                </label>
                              </div>

                              {/* Manual Method Notes */}
                              {selectedMethod === 'manual' && (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Method Details</label>
                                  <textarea
                                    rows={2}
                                    value={methodNotes}
                                    onChange={handleMethodNotesChange}
                                    placeholder="Enter details or type a macro (MAN-HEM, QNS, CLOT)..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500"
                                  />
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {Object.keys(macroCodes).slice(0, 4).map(code => (
                                      <span key={code} className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{code}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Analyzer Selection */}
                              {selectedMethod === 'analyzer' && (
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-gray-600">Select Analyzer</label>
                                  {availableAnalyzers.map((analyzer) => (
                                    <label key={analyzer.id}
                                      className={`flex items-center justify-between p-2.5 border rounded-lg cursor-pointer transition-colors ${
                                        selectedAnalyzer === analyzer.id 
                                          ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' 
                                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                      }`}>
                                      <div className="flex items-center gap-2">
                                        <input type="radio" name="analyzer" value={analyzer.id}
                                          checked={selectedAnalyzer === analyzer.id}
                                          onChange={() => setSelectedAnalyzer(analyzer.id)}
                                          className="text-teal-600 focus:ring-teal-500" />
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{analyzer.name}</div>
                                          <div className="text-xs text-gray-500">Cal: {analyzer.lastCalibrated}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {analyzer.qcStatus === 'pass' && (
                                          <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">QC âœ“</span>
                                        )}
                                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                                          analyzer.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>{analyzer.status}</span>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Reagent Lots - Editable when unlocked */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <BeakerIcon /> Reagent Lots {isUnlocked && <span className="text-xs text-amber-600">(Editable)</span>}
                          </h4>
                          
                          {!isUnlocked ? (
                            // Read-only view
                            result.reagentLots.length > 0 ? (
                              <div className="space-y-2">
                                {result.reagentLots.map((lot, idx) => (
                                  <div key={idx} className={`p-2 border rounded-lg text-sm ${
                                    lot.status === 'expiring-soon' ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900">{lot.name}</span>
                                      {lot.status === 'expiring-soon' && (
                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Expiring</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Lot: <span className="font-mono">{lot.lot}</span> â€¢ Exp: {lot.expires}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic p-3 border border-dashed border-gray-200 rounded-lg">
                                No reagents recorded
                              </div>
                            )
                          ) : (
                            // Editable view
                            <div className="space-y-3">
                              {availableReagents.map((reagent) => (
                                <div key={reagent.id}>
                                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">{reagent.name}</label>
                                  <div className="space-y-1.5">
                                    {reagent.lots.map((lot) => (
                                      <label key={lot.lotNumber}
                                        className={`flex items-center justify-between p-2 border-2 rounded-lg cursor-pointer transition-colors ${
                                          selectedReagentLots[reagent.id] === lot.lotNumber
                                            ? 'border-teal-500 bg-teal-50'
                                            : lot.fifoRank === 1 && !selectedReagentLots[reagent.id]
                                              ? 'border-teal-300 bg-teal-50/50'
                                              : getLotStatusStyle(lot.status, false)
                                        }`}>
                                        <div className="flex items-center gap-2">
                                          <input type="radio" name={`reagent-${reagent.id}`} value={lot.lotNumber}
                                            checked={selectedReagentLots[reagent.id] === lot.lotNumber}
                                            onChange={() => setSelectedReagentLots({...selectedReagentLots, [reagent.id]: lot.lotNumber})}
                                            className="text-teal-600" />
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-mono text-gray-900">{lot.lotNumber}</span>
                                              {lot.fifoRank === 1 && (
                                                <span className="px-1 py-0.5 rounded text-xs bg-teal-100 text-teal-700">FIFO</span>
                                              )}
                                              {lot.status === 'expiring-soon' && (
                                                <span className="px-1 py-0.5 rounded text-xs bg-amber-100 text-amber-700">Expiring</span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-500">Exp: {lot.expires} â€¢ {lot.remaining}</div>
                                          </div>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order Info Tab */}
                    {selectedTab === 'orderinfo' && result.orderInfo && (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Clinician & Department</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Clinician:</span>
                              <span className="font-medium text-gray-900">{result.orderInfo.clinician}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Phone:</span>
                              <span className="text-gray-900">{result.orderInfo.clinicianPhone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Department:</span>
                              <span className="text-gray-900">{result.orderInfo.department}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Priority:</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                result.orderInfo.priority === 'STAT' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                              }`}>{result.orderInfo.priority}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Sample Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Collection Date:</span>
                              <span className="text-gray-900">{result.orderInfo.collectionDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Received Date:</span>
                              <span className="text-gray-900">{result.orderInfo.receivedDate}</span>
                            </div>
                            {result.orderInfo.fastingStatus && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Fasting Status:</span>
                                <span className="text-gray-900">{result.orderInfo.fastingStatus}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {result.orderInfo.clinicalHistory && (
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Clinical History</h4>
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                              {result.orderInfo.clinicalHistory}
                            </div>
                          </div>
                        )}
                        {result.orderInfo.diagnosis && (
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Diagnosis</h4>
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                              {result.orderInfo.diagnosis}
                            </div>
                          </div>
                        )}
                        {result.orderInfo.medicationList && (
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Medications</h4>
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                              {result.orderInfo.medicationList}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attachments Tab */}
                    {selectedTab === 'attachments' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-700">Attached Files</h4>
                          {isUnlocked && (
                            <button className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                              <UploadIcon /> Upload File
                            </button>
                          )}
                        </div>
                        {result.attachments && result.attachments.length > 0 ? (
                          <div className="space-y-2">
                            {result.attachments.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    file.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    {file.type === 'pdf' ? <FileTextIcon /> : <PaperclipIcon />}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{file.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {file.size} â€¢ Uploaded by {file.uploadedBy} â€¢ {file.uploadedAt}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    file.source === 'order' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                                  }`}>
                                    {file.source === 'order' ? 'Order' : 'Result'}
                                  </span>
                                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                    <DownloadIcon />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <PaperclipIcon />
                            <p className="mt-2 text-sm">No files attached</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* History Tab */}
                    {selectedTab === 'history' && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <HistoryIcon /> Previous Results
                        </h4>
                        {result.previousResults.length > 0 ? (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                                <th className="text-left py-2 text-gray-500 font-medium">Result</th>
                                <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                                <th className="text-left py-2 text-gray-500 font-medium">Delta</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-100 bg-teal-50">
                                <td className="py-2 text-gray-900 font-medium">{result.testDate} (Current)</td>
                                <td className="py-2 font-semibold text-gray-900">{result.result} {result.unit}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    result.isNormal ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {result.isNormal ? 'Normal' : 'Abnormal'}
                                  </span>
                                </td>
                                <td className="py-2">â€”</td>
                              </tr>
                              {result.previousResults.map((prev, idx) => {
                                const currentVal = parseFloat(result.result);
                                const prevVal = parseFloat(prev.value);
                                const delta = ((currentVal - prevVal) / prevVal * 100).toFixed(1);
                                return (
                                  <tr key={idx} className="border-b border-gray-100">
                                    <td className="py-2 text-gray-600">{prev.date}</td>
                                    <td className="py-2 text-gray-900">{prev.value} {result.unit}</td>
                                    <td className="py-2">
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        prev.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {prev.status}
                                      </span>
                                    </td>
                                    <td className="py-2">
                                      <span className={delta > 0 ? 'text-orange-600' : 'text-blue-600'}>
                                        {delta > 0 ? '+' : ''}{delta}%
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-sm text-gray-400 italic p-4 border border-dashed border-gray-200 rounded-lg text-center">
                            No previous results found
                          </div>
                        )}
                      </div>
                    )}

                    {/* QA/QC Tab */}
                    {selectedTab === 'qc' && (
                      <div className="grid grid-cols-2 gap-6">
                        {/* QC Results */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <CheckCircleIcon /> QC Results
                          </h4>
                          {result.qcData.length > 0 ? (
                            <div className="space-y-2">
                              {result.qcData.map((qc, idx) => (
                                <div key={idx} className={`p-3 border rounded-lg ${
                                  qc.status === 'pass' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900">{qc.level}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      qc.status === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {qc.status === 'pass' ? 'âœ“ Pass' : 'âœ— Fail'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Expected: {qc.expected} â€¢ Actual: {qc.actual} â€¢ CV: {qc.cv}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 italic p-3 border border-dashed border-gray-200 rounded-lg">
                              No QC data (Manual method)
                            </div>
                          )}
                        </div>

                        {/* Reagent Warnings */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <AlertTriangle /> Warnings
                          </h4>
                          {result.reagentLots.filter(r => r.status === 'expiring-soon').length > 0 ? (
                            <div className="space-y-2">
                              {result.reagentLots.filter(r => r.status === 'expiring-soon').map((lot, idx) => (
                                <div key={idx} className="p-3 border border-amber-300 bg-amber-50 rounded-lg">
                                  <div className="flex items-center gap-2 text-sm text-amber-800">
                                    <AlertTriangle />
                                    <span className="font-medium">{lot.name}</span>
                                  </div>
                                  <div className="text-xs text-amber-700 mt-1">
                                    Lot {lot.lot} expires {lot.expires}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-green-600 p-3 border border-green-200 bg-green-50 rounded-lg flex items-center gap-2">
                              <CheckCircleIcon /> No warnings
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Lab #:</span> {result.labNumber}
                      {' â€¢ '}
                      <span className="font-medium">Test:</span> {result.testName}
                      {isUnlocked && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                          Editing Mode
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isUnlocked && (
                        <button 
                          onClick={() => setIsUnlocked(false)}
                          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                        >
                          Cancel Changes
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setRetestTargets([result.id]);
                          setShowRetestModal(true);
                        }}
                        className="px-4 py-2 text-sm text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg font-medium flex items-center gap-2"
                      >
                        <RefreshCwIcon /> Retest
                      </button>
                      <button 
                        onClick={() => alert(`Validating and releasing result ${result.id}`)}
                        className="px-4 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg font-medium flex items-center gap-2"
                      >
                        <CheckIcon /> {isUnlocked ? 'Save & Release' : 'Accept & Release'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No results found matching your criteria.</p>
          </div>
        )}

        {/* Pagination */}
        {paginatedResults.length > 0 && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            {/* Left side - showing info */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{' '}
                <span className="font-medium text-gray-900">{endIndex}</span> of{' '}
                <span className="font-medium text-gray-900">{totalResults}</span> results
              </span>
            </div>
            
            {/* Center - page size selector */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-gray-500">per page</span>
            </div>
            
            {/* Right side - pagination controls */}
            <div className="flex items-center gap-1">
              {/* First page */}
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="First page"
              >
                Â«Â«
              </button>
              
              {/* Previous page */}
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1 mx-2">
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  
                  if (startPage > 1) {
                    pages.push(
                      <button key={1} onClick={() => setCurrentPage(1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">1</button>
                    );
                    if (startPage > 2) {
                      pages.push(<span key="dots1" className="px-2 text-gray-400">...</span>);
                    }
                  }
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === i
                            ? 'bg-teal-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(<span key="dots2" className="px-2 text-gray-400">...</span>);
                    }
                    pages.push(
                      <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">{totalPages}</button>
                    );
                  }
                  
                  return pages;
                })()}
              </div>
              
              {/* Next page */}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
              
              {/* Last page */}
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Last page"
              >
                Â»Â»
              </button>
            </div>
          </div>
        </div>
        )}
        
        </>
        )}
      </div>

      {/* Retest Modal */}
      {showRetestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCwIcon /> Send for Retest
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                {retestTargets.length === 1 
                  ? 'This result will be sent back for retesting. The status will be reset to "Pending" and the technician will need to re-enter the result.'
                  : `${retestTargets.length} results will be sent back for retesting. Their status will be reset to "Pending" and the technician will need to re-enter the results.`
                }
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retest Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={retestReason}
                  onChange={(e) => setRetestReason(e.target.value)}
                  placeholder="Enter the reason for requesting a retest..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be added as an internal note and recorded in the result history.
                </p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>Note:</strong> Retest requests are logged in the audit trail with your user ID and timestamp.
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowRetestModal(false);
                  setRetestReason('');
                  setRetestTargets([]);
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmRetest}
                disabled={!retestReason.trim()}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  retestReason.trim()
                    ? 'text-white bg-amber-600 hover:bg-amber-700'
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                }`}
              >
                Confirm Retest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationPageRedesign;
