import React, { useState } from 'react';
import { 
  User, Calendar, Activity, Send, CheckCircle, AlertCircle, 
  FileJson, Copy, Search, Users, PlusCircle, ChevronRight,
  MapPin, Phone, Syringe, Pill, ChevronDown, ChevronUp, Fingerprint,
  ShieldAlert, CalendarClock, Stethoscope, Mail, XCircle, AlertTriangle,
  ClipboardList, FileText, Sparkles, Heart // New icon for Conditions
} from 'lucide-react';

// --- SIMPLE MARKDOWN RENDERER ---
// Handles Headers (#, ##), Lists (-, *), and Bold (**text**)
const SimpleMarkdown = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-5 space-y-1 mb-3">
          {currentList.map((item, i) => (
            <li key={i} className="text-sm text-slate-700 pl-1">
                <InlineMarkdown text={item} />
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    if (!trimmed) {
        flushList();
        return;
    }

    // Handle Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.substring(2));
    } else {
      flushList();
      
      // Handle Headers
      if (trimmed.startsWith('###')) {
        elements.push(<h4 key={index} className="text-sm font-bold text-slate-900 mt-4 mb-2"><InlineMarkdown text={trimmed.replace(/^###\s*/, '')} /></h4>);
      } else if (trimmed.startsWith('##')) {
        elements.push(<h3 key={index} className="text-base font-bold text-slate-800 mt-5 mb-2 pb-1 border-b border-slate-100"><InlineMarkdown text={trimmed.replace(/^##\s*/, '')} /></h3>);
      } else if (trimmed.startsWith('#')) {
        elements.push(<h2 key={index} className="text-lg font-bold text-slate-800 mt-6 mb-3"><InlineMarkdown text={trimmed.replace(/^#\s*/, '')} /></h2>);
      } else {
        // Handle Paragraphs
        elements.push(<p key={index} className="text-sm text-slate-700 leading-relaxed mb-2"><InlineMarkdown text={trimmed} /></p>);
      }
    }
  });
  
  flushList(); 

  return <div>{elements}</div>;
};

// Helper to parse **bold** text
const InlineMarkdown = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
};

export default function App() {
  // App State
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'search'
  const [createMode, setCreateMode] = useState('patient'); // 'patient' | 'appointment'

  // --- CREATE PATIENT STATE ---
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'unknown',
    birthDate: '',
    phone: '',
    email: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: ''
  });

  // --- CREATE APPOINTMENT STATE ---
  const [apptForm, setApptForm] = useState({
    patientId: '',
    practitionerId: '', 
    practitionerFirstName: '',
    practitionerLastName: '',
    practitionerAddressLine: '',
    practitionerCity: '',
    practitionerState: '',
    practitionerZip: '',
    practitionerPhone: '',
    practitionerEmail: '',
    start: '',
    end: '',
    description: ''
  });

  // --- CANCELLATION STATE ---
  const [cancelState, setCancelState] = useState({
    id: null, 
    reason: ''
  });

  const [createStatus, setCreateStatus] = useState('idle');
  const [createResponse, setCreateResponse] = useState(null);
  const [createError, setCreateError] = useState('');

  // --- SEARCH PATIENT STATE ---
  const [searchParams, setSearchParams] = useState({
    name: '', 
    id: '' 
  });
  const [searchStatus, setSearchStatus] = useState('idle');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  // --- CLINICAL DATA STATE ---
  const [expandedSection, setExpandedSection] = useState(null); 
  const [immunizationCache, setImmunizationCache] = useState({}); 
  const [medicationCache, setMedicationCache] = useState({}); 
  const [allergyCache, setAllergyCache] = useState({}); 
  const [appointmentCache, setAppointmentCache] = useState({});
  const [procedureCache, setProcedureCache] = useState({}); 
  const [conditionCache, setConditionCache] = useState({}); // New Cache for Conditions
  const [summaryCache, setSummaryCache] = useState({}); 

  // --- HANDLERS: CREATE PATIENT ---
  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateStatus('loading');
    setCreateResponse(null);
    setCreateError('');

    const patientResource = {
      resourceType: "Patient",
      active: true,
      name: [{ use: "official", family: createForm.lastName, given: [createForm.firstName] }],
      gender: createForm.gender,
      birthDate: createForm.birthDate,
      telecom: [],
      address: []
    };

    if (createForm.phone) patientResource.telecom.push({ system: 'phone', value: createForm.phone, use: 'mobile' });
    if (createForm.email) patientResource.telecom.push({ system: 'email', value: createForm.email, use: 'home' });

    if (createForm.addressLine || createForm.city || createForm.state || createForm.postalCode) {
        patientResource.address.push({
            use: 'home',
            line: createForm.addressLine ? [createForm.addressLine] : [],
            city: createForm.city,
            state: createForm.state,
            postalCode: createForm.postalCode
        });
    }

    try {
      const res = await fetch('https://hapi.fhir.org/baseR4/Patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' },
        body: JSON.stringify(patientResource)
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCreateResponse(data);
      setCreateStatus('success');
    } catch (error) {
      setCreateError(error.message);
      setCreateStatus('error');
    }
  };

  // --- HANDLERS: CREATE APPOINTMENT ---
  const handleApptChange = (e) => {
    const { name, value } = e.target;
    setApptForm(prev => ({ ...prev, [name]: value }));
  };

  const handleApptSubmit = async (e) => {
    e.preventDefault();
    setCreateStatus('loading');
    setCreateResponse(null);
    setCreateError('');

    try {
      const patRes = await fetch(`https://hapi.fhir.org/baseR4/Patient/${apptForm.patientId}`, { method: 'GET', headers: { 'Accept': 'application/fhir+json' } });
      if (patRes.status === 404) throw new Error(`Patient ID "${apptForm.patientId}" not found.`);
      if (!patRes.ok) throw new Error(`Error checking Patient ID: ${patRes.status}`);

      let finalPractitionerId = apptForm.practitionerId;

      if (finalPractitionerId) {
        const pracRes = await fetch(`https://hapi.fhir.org/baseR4/Practitioner/${finalPractitionerId}`, { method: 'GET', headers: { 'Accept': 'application/fhir+json' } });
        if (pracRes.status === 404) throw new Error(`Practitioner ID "${finalPractitionerId}" not found.`);
        if (!pracRes.ok) throw new Error(`Error checking Practitioner ID: ${pracRes.status}`);
      } else {
        if (!apptForm.practitionerFirstName || !apptForm.practitionerLastName) throw new Error("Practitioner Name is required.");
        
        const newPractitioner = {
            resourceType: "Practitioner",
            active: true,
            name: [{ use: "official", family: apptForm.practitionerLastName, given: [apptForm.practitionerFirstName] }],
            telecom: [],
            address: []
        };
        if (apptForm.practitionerPhone) newPractitioner.telecom.push({ system: 'phone', value: apptForm.practitionerPhone, use: 'work' });
        if (apptForm.practitionerEmail) newPractitioner.telecom.push({ system: 'email', value: apptForm.practitionerEmail, use: 'work' });
        if (apptForm.practitionerAddressLine || apptForm.practitionerCity || apptForm.practitionerState || apptForm.practitionerZip) {
            newPractitioner.address.push({
                use: 'work',
                line: apptForm.practitionerAddressLine ? [apptForm.practitionerAddressLine] : [],
                city: apptForm.practitionerCity,
                state: apptForm.practitionerState,
                postalCode: apptForm.practitionerZip
            });
        }

        const createPracRes = await fetch('https://hapi.fhir.org/baseR4/Practitioner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' },
            body: JSON.stringify(newPractitioner)
        });
        if (!createPracRes.ok) throw new Error(`Failed to create new Practitioner: ${createPracRes.status}`);
        const pracData = await createPracRes.json();
        finalPractitionerId = pracData.id;
      }

      const appointmentResource = {
        resourceType: "Appointment",
        status: "booked",
        description: apptForm.description || "Check-up",
        start: new Date(apptForm.start).toISOString(),
        end: new Date(apptForm.end).toISOString(),
        participant: [
            { actor: { reference: `Patient/${apptForm.patientId}` }, status: "accepted" },
            { actor: { reference: `Practitioner/${finalPractitionerId}` }, status: "accepted" }
        ]
      };

      const apptRes = await fetch('https://hapi.fhir.org/baseR4/Appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' },
        body: JSON.stringify(appointmentResource)
      });

      if (!apptRes.ok) throw new Error(`Failed to create Appointment: ${apptRes.status}`);
      const apptData = await apptRes.json();

      setCreateResponse(apptData);
      setCreateStatus('success');

    } catch (error) {
      setCreateError(error.message);
      setCreateStatus('error');
    }
  };

  // --- HANDLERS: CANCEL APPOINTMENT ---
  const handleCancelAppt = async (patientId, originalAppt) => {
    if (!cancelState.reason.trim()) return;

    const updatedAppt = {
      ...originalAppt,
      status: 'cancelled',
      cancelationReason: { text: cancelState.reason }
    };

    try {
      const res = await fetch(`https://hapi.fhir.org/baseR4/Appointment/${originalAppt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' },
        body: JSON.stringify(updatedAppt)
      });

      if (!res.ok) throw new Error(`Failed to cancel: ${res.status}`);
      const finalAppt = await res.json();

      setAppointmentCache(prev => {
        const patientData = prev[patientId]?.data;
        if (!patientData) return prev;
        const newAppts = patientData.appointments.map(a => a.id === finalAppt.id ? finalAppt : a);
        return { ...prev, [patientId]: { ...prev[patientId], data: { ...patientData, appointments: newAppts } } };
      });

      setCancelState({ id: null, reason: '' });

    } catch (error) {
       alert("Error cancelling: " + error.message);
    }
  };

  // --- HANDLERS: SEARCH ---
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setSearchStatus('loading');
    setSearchResults([]);
    setSearchError('');
    setExpandedSection(null); 

    try {
      let url = 'https://hapi.fhir.org/baseR4/Patient?';
      const params = new URLSearchParams();
      params.append('_sort', '-_lastUpdated'); 
      params.append('_count', '10');

      if (searchParams.id) {
        params.append('_id', searchParams.id);
      } else if (searchParams.name) {
        params.append('name', searchParams.name);
      }

      const res = await fetch(url + params.toString(), {
        headers: { 'Accept': 'application/fhir+json' }
      });

      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      
      const bundle = await res.json();
      const patients = (bundle.entry || []).map(entry => entry.resource);
      
      setSearchResults(patients);
      setSearchStatus('success');
    } catch (error) {
      setSearchError(error.message);
      setSearchStatus('error');
    }
  };

  // --- HANDLERS: CLINICAL DATA FETCHING ---
  const toggleSection = async (patientId, type) => {
    const key = `${patientId}-${type}`;
    if (expandedSection === key) { setExpandedSection(null); return; }
    setExpandedSection(key);

    // Helper for simple fetches
    const simpleFetch = async (resourceType, cache, setCache) => {
        if (!cache[patientId]) {
            setCache(prev => ({ ...prev, [patientId]: { status: 'loading' } }));
            try {
                // Update: Condition resource also does not support generic date sorting on this server
                const sortParam = (resourceType === 'MedicationRequest' || resourceType === 'Condition') ? '' : '&_sort=-date';
                const res = await fetch(`https://hapi.fhir.org/baseR4/${resourceType}?patient=${patientId}${sortParam}`, { headers: { 'Accept': 'application/fhir+json' } });
                if(!res.ok) throw new Error(res.status);
                const b = await res.json();
                setCache(prev => ({ ...prev, [patientId]: { status: 'success', data: (b.entry||[]).map(e=>e.resource) } }));
            } catch (e) { setCache(prev => ({ ...prev, [patientId]: { status: 'error', error: e.message } })); }
        }
    };

    if (type === 'imm') simpleFetch('Immunization', immunizationCache, setImmunizationCache);
    else if (type === 'med') simpleFetch('MedicationRequest', medicationCache, setMedicationCache);
    else if (type === 'allergy') simpleFetch('AllergyIntolerance', allergyCache, setAllergyCache);
    else if (type === 'proc') simpleFetch('Procedure', procedureCache, setProcedureCache);
    else if (type === 'cond') simpleFetch('Condition', conditionCache, setConditionCache);
    else if (type === 'appt' && !appointmentCache[patientId]) {
        setAppointmentCache(prev => ({ ...prev, [patientId]: { status: 'loading' } }));
        try {
          const res = await fetch(`https://hapi.fhir.org/baseR4/Appointment?patient=${patientId}&_sort=-date&_include=Appointment:actor`, { headers: { 'Accept': 'application/fhir+json' } });
          if(!res.ok) throw new Error(res.status);
          const bundle = await res.json();
          const appointments = (bundle.entry || []).filter(e => e.resource.resourceType === 'Appointment').map(e => e.resource);
          const practitioners = (bundle.entry || []).filter(e => e.resource.resourceType === 'Practitioner').reduce((acc, e) => { acc[e.resource.id] = e.resource; return acc; }, {});
          setAppointmentCache(prev => ({ ...prev, [patientId]: { status: 'success', data: { appointments, practitioners } } }));
        } catch (e) { setAppointmentCache(prev => ({ ...prev, [patientId]: { status: 'error', error: e.message } })); }
    } 
    // --- GEMINI CLINICAL SUMMARY ---
    else if (type === 'summary') {
        if (!summaryCache[patientId]) {
            setSummaryCache(prev => ({ ...prev, [patientId]: { status: 'loading' } }));
            try {
                // 1. Fetch EVERYTHING for patient
                const fhirRes = await fetch(`https://hapi.fhir.org/baseR4/Patient/${patientId}/$everything`, { headers: { 'Accept': 'application/fhir+json' } });
                if (!fhirRes.ok) throw new Error(`Failed to fetch patient data: ${fhirRes.status}`);
                const bundle = await fhirRes.json();

                // 2. Sanitize JSON: Remove all demo data except Gender/DOB from Patient resource
                const sanitizedBundle = {
                    ...bundle,
                    entry: (bundle.entry || []).map(e => {
                        if (e.resource.resourceType === 'Patient') {
                            return {
                                ...e,
                                resource: {
                                    resourceType: 'Patient',
                                    id: e.resource.id,
                                    gender: e.resource.gender,
                                    birthDate: e.resource.birthDate
                                    // Explicitly excluding name, address, telecom, etc.
                                }
                            };
                        }
                        return e;
                    })
                };

                // 3. Call Local Vercel API
                const apiRes = await fetch('/api/generate-summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bundle: sanitizedBundle })
                });

                if (!apiRes.ok) {
                    const errorData = await apiRes.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server Error: ${apiRes.status}`);
                }

                const { summary } = await apiRes.json();
                setSummaryCache(prev => ({ ...prev, [patientId]: { status: 'success', data: summary } }));

            } catch (e) {
                setSummaryCache(prev => ({ ...prev, [patientId]: { status: 'error', error: e.message } }));
            }
        }
    }
  };

  // --- HELPERS ---
  const copyToClipboard = (data) => {
    const textArea = document.createElement("textarea");
    textArea.value = JSON.stringify(data, null, 2);
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  };

  const getPatientName = (p) => {
    if (p.name && p.name.length > 0) {
      const name = p.name[0];
      return `${name.given ? name.given.join(' ') : ''} ${name.family || ''}`.trim() || 'Unnamed';
    }
    return 'Unnamed';
  };
  
  const getPractitionerName = (p) => {
    if (p.name && p.name.length > 0) {
      const name = p.name[0];
      return `${name.prefix ? name.prefix.join(' ') : ''} ${name.given ? name.given.join(' ') : ''} ${name.family || ''}`.trim();
    }
    return 'Unnamed Practitioner';
  };

  const getPatientAddress = (p) => {
    if (p.address && p.address.length > 0) {
      const addr = p.address[0];
      return [(addr.line || []).join(' '), addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ');
    }
    return 'No address recorded';
  };

  const getPatientTelecom = (p) => {
    if (p.telecom && p.telecom.length > 0) {
      return `${p.telecom[0].value} (${p.telecom[0].system})`;
    }
    return null;
  };

  const getPatientIdentifiers = (p) => {
    if (!p.identifier || p.identifier.length === 0) return [];
    return p.identifier.map((id, idx) => {
      const value = id.value || 'N/A';
      let label = 'ID';
      if (id.type?.text) label = id.type.text;
      else if (id.type?.coding?.[0]?.display) label = id.type.coding[0].display;
      else if (id.system) {
        if(id.system.includes('ssn')) label = 'SSN';
        else if(id.system.includes('driver')) label = 'License';
        else label = 'System ID';
      }
      return { label, value, key: idx };
    });
  };

  const getVaccineName = (imm) => imm.vaccineCode?.text || imm.vaccineCode?.coding?.[0]?.display || imm.vaccineCode?.coding?.[0]?.code || 'Unknown Vaccine';

  const getMedicationDetails = (med) => {
    let name = med.medicationCodeableConcept?.text || med.medicationCodeableConcept?.coding?.[0]?.display || med.medicationReference?.display || 'Unspecified Medication';
    let dosage = med.dosageInstruction?.map(d => d.text).filter(Boolean).join('; ') || null;
    let reason = med.reasonReference?.map(r => r.display).join(', ') || med.reasonCode?.map(c => c.text || c.coding?.[0]?.display).join(', ') || null;
    return { name, dosage, reason, status: med.status };
  };

  const getAllergyDetails = (alg) => {
    const name = alg.code?.text || alg.code?.coding?.[0]?.display || 'Unknown Allergy';
    const clinicalStatus = alg.clinicalStatus?.coding?.[0]?.code || 'unknown status';
    const type = alg.type || 'Intolerance';
    const category = alg.category ? alg.category.join(', ') : 'Unspecified';
    const criticality = alg.criticality || 'unknown';
    const recordedDate = alg.recordedDate ? new Date(alg.recordedDate).toLocaleDateString() : null;
    const onset = alg.onsetDateTime ? new Date(alg.onsetDateTime).toLocaleDateString() : null;
    const reactions = (alg.reaction || []).map(r => ({
        manifestation: (r.manifestation || []).map(m => m.text || m.coding?.[0]?.display).filter(Boolean).join(', ') || 'Unknown',
        severity: r.severity || ''
    }));
    return { name, clinicalStatus, type, category, criticality, reactions, recordedDate, onset };
  };

  const getProcedureDetails = (proc) => {
    let category = 'Uncategorized';
    if (proc.category) {
        category = proc.category.text || proc.category.coding?.[0]?.display || proc.category.coding?.[0]?.code || category;
        const sys = proc.category.coding?.[0]?.system;
        if(sys) category += ` (${sys.split('/').pop()})`;
    }
    let code = proc.code?.text || proc.code?.coding?.[0]?.display || 'Unknown Procedure';
    let codeDetails = proc.code?.coding?.[0] ? `${proc.code.coding[0].code} [${proc.code.coding[0].system}]` : '';
    let performed = 'Unknown Date';
    if (proc.performedDateTime) performed = new Date(proc.performedDateTime).toLocaleString();
    else if (proc.performedPeriod) performed = `${new Date(proc.performedPeriod.start).toLocaleDateString()} - ${new Date(proc.performedPeriod.end).toLocaleDateString()}`;
    else if (proc.performedString) performed = proc.performedString;
    const performer = proc.performer?.[0]?.actor?.display || 'Unknown Performer';
    return { status: proc.status, category, code, codeDetails, performed, performer };
  };

  const getConditionDetails = (cond) => {
    const clinicalStatus = cond.clinicalStatus?.coding?.[0]?.code || 'unknown';
    const verificationStatus = cond.verificationStatus?.coding?.[0]?.code || 'unknown';
    
    let category = 'Uncategorized';
    if (cond.category && cond.category.length > 0) {
        category = cond.category.map(c => c.text || c.coding?.[0]?.display || 'Unknown').join(', ');
    }

    const code = cond.code?.text || cond.code?.coding?.[0]?.display || 'Unknown Condition';
    const codeSystem = cond.code?.coding?.[0]?.system?.split('/').pop() || '';
    const codeValue = cond.code?.coding?.[0]?.code || '';
    const codeDetails = codeValue ? `${codeValue} ${codeSystem ? `[${codeSystem}]` : ''}` : '';

    const recordedDate = cond.recordedDate ? new Date(cond.recordedDate).toLocaleDateString() : null;
    const onset = cond.onsetDateTime ? new Date(cond.onsetDateTime).toLocaleDateString() : (cond.onsetString || null);

    return { clinicalStatus, verificationStatus, category, code, codeDetails, recordedDate, onset };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">FHIR Manager</h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('create')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <PlusCircle className="w-4 h-4" /> Create
            </button>
            <button onClick={() => setActiveTab('search')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'search' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Search className="w-4 h-4" /> Search
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* --- CREATE TAB --- */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
                    {createMode === 'patient' ? <User className="w-5 h-5 text-blue-500" /> : <CalendarClock className="w-5 h-5 text-blue-500" />}
                    {createMode === 'patient' ? 'New Patient' : 'New Appointment'}
                 </h2>
                 <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button 
                        onClick={() => { setCreateMode('patient'); setCreateResponse(null); setCreateError(''); }} 
                        className={`text-xs font-medium px-3 py-1 rounded-md transition-all ${createMode === 'patient' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Patient
                    </button>
                    <button 
                        onClick={() => { setCreateMode('appointment'); setCreateResponse(null); setCreateError(''); }} 
                        className={`text-xs font-medium px-3 py-1 rounded-md transition-all ${createMode === 'appointment' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Appointment
                    </button>
                 </div>
              </div>
              
              {createMode === 'patient' ? (
                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
                        <input required type="text" name="firstName" value={createForm.firstName} onChange={handleCreateChange} placeholder="Jane" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
                        <input required type="text" name="lastName" value={createForm.lastName} onChange={handleCreateChange} placeholder="Doe" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                          <select name="gender" value={createForm.gender} onChange={handleCreateChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Birth Date</label>
                          <input required type="date" name="birthDate" value={createForm.birthDate} onChange={handleCreateChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    {/* Patient Contact & Location */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                        <div className="border-b border-slate-200 pb-1 mb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase block">Contact & Location (Optional)</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-300" />
                                <input type="tel" name="phone" value={createForm.phone} onChange={handleCreateChange} placeholder="Phone" className="w-full pl-8 p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-300" />
                                <input type="email" name="email" value={createForm.email} onChange={handleCreateChange} placeholder="Email" className="w-full pl-8 p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <input type="text" name="addressLine" value={createForm.addressLine} onChange={handleCreateChange} placeholder="Address Line" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                            <div className="grid grid-cols-3 gap-2">
                                <input type="text" name="city" value={createForm.city} onChange={handleCreateChange} placeholder="City" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                                <input type="text" name="state" value={createForm.state} onChange={handleCreateChange} placeholder="State" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                                <input type="text" name="postalCode" value={createForm.postalCode} onChange={handleCreateChange} placeholder="Zip" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={createStatus === 'loading'} className="w-full mt-2 bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex justify-center items-center gap-2">
                      {createStatus === 'loading' ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"/> : <><Send className="w-4 h-4" /> Create Patient</>}
                    </button>
                  </form>
              ) : (
                  <form onSubmit={handleApptSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Patient ID</label>
                        <input required type="text" name="patientId" value={apptForm.patientId} onChange={handleApptChange} placeholder="e.g. 12345" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    
                    {/* Practitioner Section */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                                Practitioner ID
                                <span className="text-[10px] font-normal text-slate-400 lowercase">optional - leave empty to create new</span>
                            </label>
                            <div className="relative">
                                <Stethoscope className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input type="text" name="practitionerId" value={apptForm.practitionerId} onChange={handleApptChange} placeholder="Existing ID..." className="w-full pl-9 p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        {!apptForm.practitionerId && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Dr. First Name</label>
                                        <input required type="text" name="practitionerFirstName" value={apptForm.practitionerFirstName} onChange={handleApptChange} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Dr. Last Name</label>
                                        <input required type="text" name="practitionerLastName" value={apptForm.practitionerLastName} onChange={handleApptChange} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>

                                {/* Contact & Location */}
                                <div className="border-t border-slate-200 pt-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Contact & Location (Optional)</label>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="relative">
                                            <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-300" />
                                            <input type="tel" name="practitionerPhone" value={apptForm.practitionerPhone} onChange={handleApptChange} placeholder="Phone" className="w-full pl-8 p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                                        </div>
                                        <div className="relative">
                                            <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-300" />
                                            <input type="email" name="practitionerEmail" value={apptForm.practitionerEmail} onChange={handleApptChange} placeholder="Email" className="w-full pl-8 p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <input type="text" name="practitionerAddressLine" value={apptForm.practitionerAddressLine} onChange={handleApptChange} placeholder="Address Line (e.g. 123 Medical Way)" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                                        <div className="grid grid-cols-3 gap-2">
                                            <input type="text" name="practitionerCity" value={apptForm.practitionerCity} onChange={handleApptChange} placeholder="City" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                                            <input type="text" name="practitionerState" value={apptForm.practitionerState} onChange={handleApptChange} placeholder="State" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                                            <input type="text" name="practitionerZip" value={apptForm.practitionerZip} onChange={handleApptChange} placeholder="Zip" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                            <input required type="datetime-local" name="start" value={apptForm.start} onChange={handleApptChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">End Time</label>
                            <input required type="datetime-local" name="end" value={apptForm.end} onChange={handleApptChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                        <input required type="text" name="description" value={apptForm.description} onChange={handleApptChange} placeholder="Reason for visit..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <button type="submit" disabled={createStatus === 'loading'} className="w-full mt-2 bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex justify-center items-center gap-2">
                      {createStatus === 'loading' ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"/> : <><CalendarClock className="w-4 h-4" /> Book Appointment</>}
                    </button>
                  </form>
              )}
            </section>

            <section className="space-y-4">
              {createStatus === 'error' && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{createError}</p></div>}
              {createStatus === 'success' && createResponse && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                        <h3 className="font-bold text-green-800">{createMode === 'patient' ? 'Patient Created' : 'Appointment Booked'}</h3>
                        <p className="text-green-700 text-xs">ID: {createResponse.id}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                    <div className="bg-slate-800 px-4 py-2 flex justify-between items-center"><span className="text-xs text-slate-400 font-mono">JSON RESPONSE</span><button onClick={() => copyToClipboard(createResponse)} className="text-slate-400 hover:text-white"><Copy className="w-4 h-4" /></button></div>
                    <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto">{JSON.stringify(createResponse, null, 2)}</pre>
                  </div>
                </div>
              )}
              {createStatus === 'idle' && <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-xl"><FileJson className="w-12 h-12 mb-2 opacity-50" /><p className="text-sm">Response will appear here</p></div>}
            </section>
          </div>
        )}

        {/* --- SEARCH TAB --- */}
        {activeTab === 'search' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Patient Name</label><div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="text" name="name" value={searchParams.name} onChange={handleSearchChange} placeholder="Search by name..." className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div></div>
                <div className="flex-1 w-full space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Patient ID</label><input type="text" name="id" value={searchParams.id} onChange={handleSearchChange} placeholder="Specific Resource ID..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <button type="submit" disabled={searchStatus === 'loading'} className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors h-[42px]">{searchStatus === 'loading' ? 'Searching...' : 'Search'}</button>
              </form>
            </section>

            <section>
              {searchStatus === 'error' && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 flex gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{searchError}</p></div>}
              {searchStatus === 'success' && searchResults.length === 0 && <div className="bg-white p-12 rounded-xl border border-slate-200 text-center"><Users className="w-12 h-12 mx-auto text-slate-300 mb-3" /><h3 className="text-slate-800 font-medium">No Patients Found</h3><p className="text-slate-500 text-sm mt-1">Try adjusting your search terms.</p></div>}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide ml-1">Found {searchResults.length} Patients</h3>
                  {searchResults.map((patient) => (
                    <div key={patient.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 w-full">
                            <div className="bg-blue-50 p-3 rounded-full flex-shrink-0"><User className="w-6 h-6 text-blue-600" /></div>
                            <div className="flex-grow min-w-0">
                              <h4 className="font-bold text-slate-800 text-lg truncate">{getPatientName(patient)}</h4>
                              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5"><span className="font-mono bg-slate-100 px-1.5 rounded text-xs">ID: {patient.id}</span></span>
                                <span className="flex items-center gap-1.5 capitalize"><Users className="w-3.5 h-3.5" /> {patient.gender || 'Unknown'}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {patient.birthDate || 'N/A'}</span>
                              </div>
                              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-start gap-2 text-sm text-slate-600"><MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" /><span className="text-xs md:text-sm">{getPatientAddress(patient)}</span></div>
                                    {getPatientTelecom(patient) && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="text-xs md:text-sm">{getPatientTelecom(patient)}</span></div>}
                                </div>
                                {getPatientIdentifiers(patient).length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {getPatientIdentifiers(patient).map((id) => (
                                            <span key={id.key} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                                <Fingerprint className="w-3 h-3 text-slate-400" />
                                                <span className="text-slate-500 font-semibold">{id.label}:</span>
                                                <span className="font-mono text-slate-700">{id.value}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0 ml-2">
                            <button onClick={() => copyToClipboard(patient)} className="text-slate-300 hover:text-blue-600 transition-colors p-2 rounded hover:bg-blue-50" title="Copy JSON"><FileJson className="w-5 h-5" /></button>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-3 justify-end">
                            {/* Clinical Summary (AI) Button */}
                            <button 
                                onClick={() => toggleSection(patient.id, 'summary')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                    ${expandedSection === `${patient.id}-summary` ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                <Sparkles className="w-4 h-4" /> Clinical Summary
                                {expandedSection === `${patient.id}-summary` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {/* Appointments Button */}
                            <button 
                                onClick={() => toggleSection(patient.id, 'appt')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                    ${expandedSection === `${patient.id}-appt` ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                <CalendarClock className="w-4 h-4" /> Appointments
                                {expandedSection === `${patient.id}-appt` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {/* Conditions Button */}
                            <button 
                                onClick={() => toggleSection(patient.id, 'cond')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                    ${expandedSection === `${patient.id}-cond` ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                <Heart className="w-4 h-4" /> Conditions
                                {expandedSection === `${patient.id}-cond` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {/* Procedures Button */}
                            <button 
                                onClick={() => toggleSection(patient.id, 'proc')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                    ${expandedSection === `${patient.id}-proc` ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                <ClipboardList className="w-4 h-4" /> Procedures
                                {expandedSection === `${patient.id}-proc` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {/* Allergies Button */}
                            <button 
                                onClick={() => toggleSection(patient.id, 'allergy')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                    ${expandedSection === `${patient.id}-allergy` ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                <ShieldAlert className="w-4 h-4" /> Allergies
                                {expandedSection === `${patient.id}-allergy` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            
                            {/* Medications Button */}
                            <button 
                                onClick={() => toggleSection(patient.id, 'med')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                    ${expandedSection === `${patient.id}-med` ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                <Pill className="w-4 h-4" /> Medications
                                {expandedSection === `${patient.id}-med` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            
                            {/* Immunizations Button */}
                            <button 
                                onClick={() => toggleSection(patient.id, 'imm')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                    ${expandedSection === `${patient.id}-imm` ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                <Syringe className="w-4 h-4" /> Immunizations
                                {expandedSection === `${patient.id}-imm` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                      </div>

                      {/* --- EXPANDABLE PANELS --- */}
                      
                      {/* Clinical Summary Panel (NEW) */}
                      {expandedSection === `${patient.id}-summary` && (
                        <div className="bg-emerald-50 border-t border-emerald-100 p-4 animate-in slide-in-from-top-2">
                             {(!summaryCache[patient.id] || summaryCache[patient.id].status === 'loading') && (
                                <div className="flex flex-col items-center justify-center py-8 text-emerald-700 gap-3">
                                    <Sparkles className="w-6 h-6 animate-pulse text-emerald-500" />
                                    <span className="text-sm font-medium">Analyzing patient records with AI...</span>
                                </div>
                             )}
                             {summaryCache[patient.id]?.status === 'error' && (
                                <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded border border-red-100">
                                    <AlertTriangle className="w-5 h-5" />
                                    <div>
                                        <p className="font-bold">Generation Failed</p>
                                        <p className="text-xs">{summaryCache[patient.id].error}</p>
                                    </div>
                                </div>
                             )}
                             {summaryCache[patient.id]?.status === 'success' && (
                                <div className="bg-white p-6 rounded-lg border border-emerald-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                        <Sparkles className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-bold text-slate-800">Clinical Summary</h3>
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full ml-auto">AI Generated</span>
                                    </div>
                                    {/* Custom Markdown Renderer */}
                                    <div className="max-w-none text-slate-700 font-sans leading-relaxed">
                                        <SimpleMarkdown content={summaryCache[patient.id].data} />
                                    </div>
                                </div>
                             )}
                        </div>
                      )}

                      {/* Appointments Panel */}
                      {expandedSection === `${patient.id}-appt` && (
                        <div className="bg-blue-50 border-t border-blue-100 p-4 animate-in slide-in-from-top-2">
                             {(!appointmentCache[patient.id] || appointmentCache[patient.id].status === 'loading') && (
                                <div className="flex items-center justify-center py-4 text-blue-600 gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading records...</span></div>
                             )}
                             {appointmentCache[patient.id]?.status === 'error' && <div className="flex items-center gap-2 text-red-600 text-sm p-2 bg-red-50 rounded border border-red-100"><AlertCircle className="w-4 h-4" />{appointmentCache[patient.id].error}</div>}
                             {appointmentCache[patient.id]?.status === 'success' && (
                                <div>
                                    {appointmentCache[patient.id].data.appointments.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2 italic">No appointments found for this patient.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {appointmentCache[patient.id].data.appointments.map((appt) => {
                                                const actors = (appt.participant || []).map(p => {
                                                    const ref = p.actor?.reference;
                                                    if (ref && ref.includes('Practitioner/')) {
                                                        const id = ref.split('/')[1];
                                                        const pract = appointmentCache[patient.id].data.practitioners[id];
                                                        return pract ? { name: getPractitionerName(pract), resource: pract } : null;
                                                    }
                                                    return null;
                                                }).filter(Boolean);
                                                
                                                const start = appt.start ? new Date(appt.start).toLocaleString() : 'TBD';
                                                const end = appt.end ? new Date(appt.end).toLocaleTimeString() : '';
                                                const typeText = appt.serviceType?.[0]?.text || appt.serviceType?.[0]?.coding?.[0]?.display || 'General Appointment';
                                                const cancelReason = appt.cancelationReason?.text || appt.cancelationReason?.coding?.[0]?.display;
                                                const isCancelling = cancelState.id === appt.id;

                                                return (
                                                    <div key={appt.id} className="bg-white p-3 rounded border border-blue-100 shadow-sm relative overflow-hidden">
                                                        {/* Cancellation Overlay */}
                                                        {isCancelling ? (
                                                            <div className="animate-in fade-in">
                                                                <h5 className="text-sm font-bold text-red-600 flex items-center gap-2 mb-2">
                                                                    <AlertTriangle className="w-4 h-4" /> Cancel Appointment?
                                                                </h5>
                                                                <textarea
                                                                    className="w-full text-xs p-2 border border-red-200 rounded bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-500 mb-2"
                                                                    rows="2"
                                                                    placeholder="Reason for cancellation..."
                                                                    value={cancelState.reason}
                                                                    onChange={(e) => setCancelState(prev => ({ ...prev, reason: e.target.value }))}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => handleCancelAppt(patient.id, appt)}
                                                                        className="flex-1 bg-red-600 text-white text-xs font-bold py-1.5 rounded hover:bg-red-700 transition-colors"
                                                                    >
                                                                        Confirm Cancel
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setCancelState({ id: null, reason: '' })}
                                                                        className="flex-1 bg-slate-200 text-slate-600 text-xs font-bold py-1.5 rounded hover:bg-slate-300 transition-colors"
                                                                    >
                                                                        Back
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-center gap-2">
                                                                        <CalendarClock className="w-4 h-4 text-blue-500" />
                                                                        <span className="font-semibold text-slate-800 text-sm">{start} {end ? `- ${end}` : ''}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                                            appt.status === 'booked' ? 'bg-green-100 text-green-700' : 
                                                                            appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                                                                        }`}>
                                                                            {appt.status}
                                                                        </span>
                                                                        {appt.status !== 'cancelled' && (
                                                                            <button 
                                                                                onClick={() => setCancelState({ id: appt.id, reason: '' })}
                                                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                                                title="Cancel Appointment"
                                                                            >
                                                                                <XCircle className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-slate-600 mt-2 font-medium">{typeText}</p>
                                                                {appt.description && <p className="text-xs text-slate-500 mt-1 italic">"{appt.description}"</p>}
                                                                
                                                                {/* Cancellation Reason Display */}
                                                                {appt.status === 'cancelled' && cancelReason && (
                                                                    <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded">
                                                                        <p className="text-[10px] font-bold text-red-800 uppercase mb-0.5">Cancellation Reason</p>
                                                                        <p className="text-xs text-red-600 italic">"{cancelReason}"</p>
                                                                    </div>
                                                                )}

                                                                {/* Practitioners List */}
                                                                {actors.length > 0 && (
                                                                    <div className="mt-2 pt-2 border-t border-slate-50">
                                                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Practitioners</p>
                                                                        <div className="space-y-2">
                                                                            {actors.map((actor, i) => (
                                                                                <div key={i} className="text-xs flex flex-col gap-1 bg-slate-50 p-2 rounded border border-slate-100">
                                                                                    <div className="flex items-center gap-1.5 mb-1">
                                                                                        <User className="w-3.5 h-3.5 text-blue-500" />
                                                                                        <span className="text-slate-800 font-semibold">{actor.name}</span>
                                                                                    </div>
                                                                                    {actor.resource.address && actor.resource.address.length > 0 && (
                                                                                        <div className="flex items-start gap-2 text-slate-600 pl-1">
                                                                                            <MapPin className="w-3 h-3 mt-0.5 text-slate-400 flex-shrink-0" />
                                                                                            <span>{getPatientAddress(actor.resource)}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {actor.resource.telecom && actor.resource.telecom.length > 0 && (
                                                                                        <div className="flex flex-col gap-1 mt-1 pl-1">
                                                                                            {actor.resource.telecom.map((t, idx) => (
                                                                                                <div key={idx} className="flex items-center gap-2 text-slate-600">
                                                                                                    <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                                                                    <span className="font-mono text-xs">{t.value}</span>
                                                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider bg-white px-1 rounded border border-slate-100">
                                                                                                        {t.system}{t.use ? ` · ${t.use}` : ''}
                                                                                                    </span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                      )}

                      {/* Procedures Panel (NEW) */}
                      {expandedSection === `${patient.id}-proc` && (
                        <div className="bg-indigo-50 border-t border-indigo-100 p-4 animate-in slide-in-from-top-2">
                             {(!procedureCache[patient.id] || procedureCache[patient.id].status === 'loading') && (
                                <div className="flex items-center justify-center py-4 text-indigo-600 gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading records...</span></div>
                             )}
                             {procedureCache[patient.id]?.status === 'error' && <div className="flex items-center gap-2 text-red-600 text-sm p-2 bg-red-50 rounded border border-red-100"><AlertCircle className="w-4 h-4" />{procedureCache[patient.id].error}</div>}
                             {procedureCache[patient.id]?.status === 'success' && (
                                <div>
                                    {procedureCache[patient.id].data.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2 italic">No procedures found for this patient.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {procedureCache[patient.id].data.map((proc) => {
                                                const details = getProcedureDetails(proc);
                                                return (
                                                    <div key={proc.id} className="bg-white p-3 rounded border border-indigo-100 shadow-sm">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-medium text-slate-800 text-sm">{details.code}</h5>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                                details.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                                                details.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {details.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-600 mt-1 space-y-1">
                                                            <p><span className="font-semibold text-slate-500">Date:</span> {details.performed}</p>
                                                            <p><span className="font-semibold text-slate-500">Category:</span> {details.category}</p>
                                                            {details.codeDetails && <p className="font-mono text-[10px] text-slate-400">{details.codeDetails}</p>}
                                                            {details.performer !== 'Unknown Performer' && <p><span className="font-semibold text-slate-500">Performer:</span> {details.performer}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                      )}

                      {/* Conditions Panel (NEW) */}
                      {expandedSection === `${patient.id}-cond` && (
                        <div className="bg-rose-50 border-t border-rose-100 p-4 animate-in slide-in-from-top-2">
                             {(!conditionCache[patient.id] || conditionCache[patient.id].status === 'loading') && (
                                <div className="flex items-center justify-center py-4 text-rose-600 gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading records...</span></div>
                             )}
                             {conditionCache[patient.id]?.status === 'error' && <div className="flex items-center gap-2 text-red-600 text-sm p-2 bg-red-50 rounded border border-red-100"><AlertCircle className="w-4 h-4" />{conditionCache[patient.id].error}</div>}
                             {conditionCache[patient.id]?.status === 'success' && (
                                <div>
                                    {conditionCache[patient.id].data.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2 italic">No conditions found for this patient.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {conditionCache[patient.id].data.map((cond) => {
                                                const details = getConditionDetails(cond);
                                                return (
                                                    <div key={cond.id} className="bg-white p-3 rounded border border-rose-100 shadow-sm">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-medium text-slate-800 text-sm flex items-center gap-2">
                                                                {details.code}
                                                            </h5>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                                details.clinicalStatus === 'active' ? 'bg-red-100 text-red-700' : 
                                                                details.clinicalStatus === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {details.clinicalStatus}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="text-xs text-slate-600 mt-1 space-y-1">
                                                            <div className="flex flex-wrap gap-2 mb-1">
                                                                {details.verificationStatus !== 'unknown' && <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-slate-500">Verif: {details.verificationStatus}</span>}
                                                                {details.category !== 'Uncategorized' && <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-slate-500">Cat: {details.category}</span>}
                                                            </div>
                                                            
                                                            {details.onset && <p><span className="font-semibold text-slate-500">Onset:</span> {details.onset}</p>}
                                                            {details.recordedDate && <p><span className="font-semibold text-slate-500">Recorded:</span> {details.recordedDate}</p>}
                                                            {details.codeDetails && <p className="font-mono text-[10px] text-slate-400">{details.codeDetails}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                      )}
                      
                      {/* Immunizations Panel */}
                      {expandedSection === `${patient.id}-imm` && (
                        <div className="bg-purple-50 border-t border-purple-100 p-4 animate-in slide-in-from-top-2">
                             {(!immunizationCache[patient.id] || immunizationCache[patient.id].status === 'loading') && (
                                <div className="flex items-center justify-center py-4 text-purple-600 gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading records...</span></div>
                             )}
                             {immunizationCache[patient.id]?.status === 'error' && <div className="flex items-center gap-2 text-red-600 text-sm p-2 bg-red-50 rounded border border-red-100"><AlertCircle className="w-4 h-4" />{immunizationCache[patient.id].error}</div>}
                             {immunizationCache[patient.id]?.status === 'success' && (
                                <div>
                                    {immunizationCache[patient.id].data.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2 italic">No immunization records found for this patient.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {immunizationCache[patient.id].data.map((imm) => (
                                                <div key={imm.id} className="bg-white p-3 rounded border border-purple-100 shadow-sm flex justify-between items-center">
                                                    <div><p className="font-medium text-slate-800">{getVaccineName(imm)}</p><p className="text-xs text-slate-500 mt-0.5">Given: {imm.occurrenceDateTime ? new Date(imm.occurrenceDateTime).toLocaleDateString() : 'Date unknown'}</p></div>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${imm.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{imm.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                      )}

                      {/* Medications Panel */}
                      {expandedSection === `${patient.id}-med` && (
                        <div className="bg-teal-50 border-t border-teal-100 p-4 animate-in slide-in-from-top-2">
                             {(!medicationCache[patient.id] || medicationCache[patient.id].status === 'loading') && (
                                <div className="flex items-center justify-center py-4 text-teal-600 gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading records...</span></div>
                             )}
                             {medicationCache[patient.id]?.status === 'error' && <div className="flex items-center gap-2 text-red-600 text-sm p-2 bg-red-50 rounded border border-red-100"><AlertCircle className="w-4 h-4" />{medicationCache[patient.id].error}</div>}
                             {medicationCache[patient.id]?.status === 'success' && (
                                <div>
                                    {medicationCache[patient.id].data.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2 italic">No medication requests found for this patient.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {medicationCache[patient.id].data.map((med) => {
                                                const details = getMedicationDetails(med);
                                                return (
                                                    <div key={med.id} className="bg-white p-3 rounded border border-teal-100 shadow-sm">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-medium text-slate-800 text-sm">{details.name}</h5>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${details.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{details.status}</span>
                                                        </div>
                                                        {details.dosage && (
                                                            <p className="text-xs text-slate-600 mt-1"><span className="font-semibold text-slate-500">Dosage:</span> {details.dosage}</p>
                                                        )}
                                                        {details.reason && (
                                                            <p className="text-xs text-slate-600 mt-1"><span className="font-semibold text-slate-500">Reason:</span> {details.reason}</p>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 mt-2 font-mono">ID: {med.id}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                      )}

                      {/* Allergies Panel */}
                      {expandedSection === `${patient.id}-allergy` && (
                        <div className="bg-orange-50 border-t border-orange-100 p-4 animate-in slide-in-from-top-2">
                             {(!allergyCache[patient.id] || allergyCache[patient.id].status === 'loading') && (
                                <div className="flex items-center justify-center py-4 text-orange-600 gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading records...</span></div>
                             )}
                             {allergyCache[patient.id]?.status === 'error' && <div className="flex items-center gap-2 text-red-600 text-sm p-2 bg-red-50 rounded border border-red-100"><AlertCircle className="w-4 h-4" />{allergyCache[patient.id].error}</div>}
                             {allergyCache[patient.id]?.status === 'success' && (
                                <div>
                                    {allergyCache[patient.id].data.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2 italic">No allergy records found for this patient.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {allergyCache[patient.id].data.map((alg) => {
                                                const details = getAllergyDetails(alg);
                                                const isHighRisk = details.criticality === 'high';
                                                return (
                                                    <div key={alg.id} className="bg-white p-3 rounded border border-orange-100 shadow-sm">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-medium text-slate-800 text-sm flex items-center gap-2">
                                                                {details.name}
                                                                {isHighRisk && <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">High Risk</span>}
                                                            </h5>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${details.clinicalStatus === 'active' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-100 text-slate-500'}`}>{details.clinicalStatus}</span>
                                                        </div>
                                                        
                                                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                                                            <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Type: <span className="font-medium">{details.type}</span></span>
                                                            <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Category: <span className="font-medium">{details.category}</span></span>
                                                            <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Criticality: <span className="font-medium">{details.criticality}</span></span>
                                                            {details.recordedDate && <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Recorded: <span className="font-medium">{details.recordedDate}</span></span>}
                                                            {details.onset && <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Onset: <span className="font-medium">{details.onset}</span></span>}
                                                        </div>

                                                        {details.reactions.length > 0 && (
                                                            <div className="mt-3 pt-2 border-t border-slate-50">
                                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Reactions</p>
                                                                <div className="space-y-1">
                                                                    {details.reactions.map((r, i) => (
                                                                        <div key={i} className="text-xs flex items-start gap-1">
                                                                            <span className="text-slate-700 font-medium">• {r.manifestation}</span>
                                                                            {r.severity && <span className="text-slate-400 italic">({r.severity})</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}