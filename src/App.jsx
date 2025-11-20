import React, { useState } from 'react';
import { 
  User, Calendar, Activity, Send, CheckCircle, AlertCircle, 
  FileJson, Copy, Search, Users, PlusCircle, ChevronRight,
  MapPin, Phone, Syringe, ChevronDown, ChevronUp, Fingerprint
} from 'lucide-react';

export default function App() {
  // App State
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'search'

  // --- CREATE PATIENT STATE ---
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'unknown',
    birthDate: ''
  });
  const [createStatus, setCreateStatus] = useState('idle');
  const [createResponse, setCreateResponse] = useState(null);
  const [createError, setCreateError] = useState('');

  // --- SEARCH PATIENT STATE ---
  const [searchParams, setSearchParams] = useState({
    name: '', // General name search
    id: ''    // Specific ID search
  });
  const [searchStatus, setSearchStatus] = useState('idle');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  // --- IMMUNIZATION STATE ---
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [immunizationCache, setImmunizationCache] = useState({}); // { [id]: { status: 'idle'|'loading'|'success'|'error', data: [], error: '' } }

  // --- HANDLERS: CREATE ---
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
      birthDate: createForm.birthDate
    };

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
    setExpandedPatientId(null); // Collapse any open details on new search

    try {
      // Construct Query Parameters
      let url = 'https://hapi.fhir.org/baseR4/Patient?';
      const params = new URLSearchParams();
      
      // Sort by last updated to see recent stuff
      params.append('_sort', '-_lastUpdated'); 
      params.append('_count', '10'); // Limit results

      if (searchParams.id) {
        params.append('_id', searchParams.id);
      } else if (searchParams.name) {
        params.append('name', searchParams.name);
      } else {
        // If empty search, just get recent patients
      }

      const res = await fetch(url + params.toString(), {
        headers: { 'Accept': 'application/fhir+json' }
      });

      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      
      const bundle = await res.json();
      
      // FHIR returns a Bundle. The actual results are in the 'entry' array.
      const patients = (bundle.entry || []).map(entry => entry.resource);
      
      setSearchResults(patients);
      setSearchStatus('success');
    } catch (error) {
      setSearchError(error.message);
      setSearchStatus('error');
    }
  };

  // --- HANDLERS: IMMUNIZATIONS ---
  const toggleImmunizations = async (patientId) => {
    // Toggle logic
    if (expandedPatientId === patientId) {
      setExpandedPatientId(null);
      return;
    }
    
    setExpandedPatientId(patientId);

    // If we haven't fetched for this patient yet, do it now
    if (!immunizationCache[patientId]) {
      setImmunizationCache(prev => ({ ...prev, [patientId]: { status: 'loading', data: [], error: '' } }));
      
      try {
        const res = await fetch(`https://hapi.fhir.org/baseR4/Immunization?patient=${patientId}&_sort=-date`, {
            headers: { 'Accept': 'application/fhir+json' }
        });
        
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        
        const bundle = await res.json();
        const immunizations = (bundle.entry || []).map(e => e.resource);
        
        setImmunizationCache(prev => ({ 
          ...prev, 
          [patientId]: { status: 'success', data: immunizations, error: '' } 
        }));

      } catch (error) {
        setImmunizationCache(prev => ({ 
          ...prev, 
          [patientId]: { status: 'error', data: [], error: error.message } 
        }));
      }
    }
  };

  // Helper: Copy JSON
  const copyToClipboard = (data) => {
    const textArea = document.createElement("textarea");
    textArea.value = JSON.stringify(data, null, 2);
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  };

  // Helper: Get Patient Name safely
  const getPatientName = (p) => {
    if (p.name && p.name.length > 0) {
      const name = p.name[0];
      const given = name.given ? name.given.join(' ') : '';
      const family = name.family || '';
      return `${given} ${family}`.trim() || 'Unnamed Patient';
    }
    return 'Unnamed Patient';
  };

  // Helper: Get Patient Address safely
  const getPatientAddress = (p) => {
    if (p.address && p.address.length > 0) {
      const addr = p.address[0];
      const parts = [
        (addr.line || []).join(' '),
        addr.city,
        addr.state,
        addr.postalCode
      ].filter(Boolean);
      return parts.join(', ');
    }
    return 'No address recorded';
  };

  // Helper: Get Telecom safely
  const getPatientTelecom = (p) => {
    if (p.telecom && p.telecom.length > 0) {
      const t = p.telecom[0];
      return `${t.value} (${t.system})`;
    }
    return null;
  };

  // Helper: Get Vaccine Name safely
  const getVaccineName = (imm) => {
    if (imm.vaccineCode) {
        if (imm.vaccineCode.text) return imm.vaccineCode.text;
        if (imm.vaccineCode.coding && imm.vaccineCode.coding.length > 0) {
            return imm.vaccineCode.coding[0].display || imm.vaccineCode.coding[0].code;
        }
    }
    return 'Unknown Vaccine';
  };

  // Helper: Get Identifiers
  const getPatientIdentifiers = (p) => {
    if (!p.identifier || p.identifier.length === 0) return [];
    return p.identifier.map((id, idx) => {
      const value = id.value || 'N/A';
      let label = 'ID';
      if (id.type?.text) label = id.type.text;
      else if (id.type?.coding?.[0]?.display) label = id.type.coding[0].display;
      else if (id.system) {
        // Try to make the system URL readable
        label = 'System ID';
        if(id.system.includes('ssn')) label = 'SSN';
        if(id.system.includes('driver')) label = 'License';
      }
      
      return { label, value, key: idx };
    });
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

          {/* Tab Navigation */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'create' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'search' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* --- CREATE TAB --- */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-700">
                <User className="w-5 h-5 text-blue-500" />
                New Patient Details
              </h2>
              
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

                <button type="submit" disabled={createStatus === 'loading'} className="w-full mt-2 bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex justify-center items-center gap-2">
                  {createStatus === 'loading' ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"/> : <><Send className="w-4 h-4" /> Create Resource</>}
                </button>
              </form>
            </section>

            <section className="space-y-4">
              {createStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{createError}</p>
                </div>
              )}
              {createStatus === 'success' && createResponse && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-bold text-green-800">Success</h3>
                      <p className="text-green-700 text-xs">ID: {createResponse.id}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                    <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-mono">JSON RESPONSE</span>
                      <button onClick={() => copyToClipboard(createResponse)} className="text-slate-400 hover:text-white"><Copy className="w-4 h-4" /></button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto">{JSON.stringify(createResponse, null, 2)}</pre>
                  </div>
                </div>
              )}
              {createStatus === 'idle' && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-xl">
                  <FileJson className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">Response will appear here</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* --- SEARCH TAB --- */}
        {activeTab === 'search' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Search Bar */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Patient Name</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      name="name"
                      value={searchParams.name}
                      onChange={handleSearchChange}
                      placeholder="Search by name..." 
                      className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                </div>
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Patient ID</label>
                  <input 
                    type="text" 
                    name="id"
                    value={searchParams.id}
                    onChange={handleSearchChange}
                    placeholder="Specific Resource ID..." 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <button type="submit" disabled={searchStatus === 'loading'} className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors h-[42px]">
                  {searchStatus === 'loading' ? 'Searching...' : 'Search'}
                </button>
              </form>
            </section>

            {/* Search Results */}
            <section>
              {searchStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{searchError}</p>
                </div>
              )}

              {searchStatus === 'success' && searchResults.length === 0 && (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="text-slate-800 font-medium">No Patients Found</h3>
                  <p className="text-slate-500 text-sm mt-1">Try adjusting your search terms.</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide ml-1">Found {searchResults.length} Patients</h3>
                  {searchResults.map((patient) => (
                    <div key={patient.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 w-full">
                            <div className="bg-blue-50 p-3 rounded-full flex-shrink-0">
                              <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <h4 className="font-bold text-slate-800 text-lg truncate">{getPatientName(patient)}</h4>
                              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <span className="font-mono bg-slate-100 px-1.5 rounded text-xs">ID: {patient.id}</span>
                                </span>
                                <span className="flex items-center gap-1.5 capitalize">
                                  <Users className="w-3.5 h-3.5" />
                                  {patient.gender || 'Unknown'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {patient.birthDate || 'N/A'}
                                </span>
                              </div>

                              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-start gap-2 text-sm text-slate-600">
                                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
                                        <span className="text-xs md:text-sm">{getPatientAddress(patient)}</span>
                                    </div>
                                    {getPatientTelecom(patient) && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <span className="text-xs md:text-sm">{getPatientTelecom(patient)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Identifiers Section */}
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
                            <button 
                              onClick={() => copyToClipboard(patient)} 
                              className="text-slate-300 hover:text-blue-600 transition-colors p-2 rounded hover:bg-blue-50"
                              title="Copy JSON"
                            >
                              <FileJson className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => toggleImmunizations(patient.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                    ${expandedPatientId === patient.id 
                                        ? 'bg-purple-100 text-purple-700' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }
                                `}
                            >
                                <Syringe className="w-4 h-4" />
                                Immunizations
                                {expandedPatientId === patient.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                      </div>

                      {/* Immunizations Section (Collapsible) */}
                      {expandedPatientId === patient.id && (
                        <div className="bg-purple-50 border-t border-purple-100 p-4 animate-in slide-in-from-top-2">
                             {/* Loading State */}
                             {(!immunizationCache[patient.id] || immunizationCache[patient.id].status === 'loading') && (
                                <div className="flex items-center justify-center py-4 text-purple-600 gap-2">
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm">Loading records...</span>
                                </div>
                             )}

                             {/* Error State */}
                             {immunizationCache[patient.id]?.status === 'error' && (
                                <div className="flex items-center gap-2 text-red-600 text-sm p-2 bg-red-50 rounded border border-red-100">
                                    <AlertCircle className="w-4 h-4" />
                                    {immunizationCache[patient.id].error}
                                </div>
                             )}

                             {/* Success State */}
                             {immunizationCache[patient.id]?.status === 'success' && (
                                <div>
                                    {immunizationCache[patient.id].data.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-2 italic">No immunization records found for this patient.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {immunizationCache[patient.id].data.map((imm) => (
                                                <div key={imm.id} className="bg-white p-3 rounded border border-purple-100 shadow-sm flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-slate-800">{getVaccineName(imm)}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Given: {imm.occurrenceDateTime ? new Date(imm.occurrenceDateTime).toLocaleDateString() : 'Date unknown'}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                        imm.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {imm.status}
                                                    </span>
                                                </div>
                                            ))}
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