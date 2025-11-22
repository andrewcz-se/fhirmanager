# **FHIR Patient Manager**

This application lets you view FHIR resources on the HAPI FHIR R4 public test server. This application allows users to create new patients, search for existing records, and view associated immunization history. I created this application as a shell and precursor to start development on some AI Agent based FHIR work.

## **Features**

* **Create Patients**: specific form to construct and POST a valid FHIR Patient resource to the server.  
* **Search Functionality**:  
  * Search by Name (partial matches supported by the server).  
  * Search by specific Resource ID.  
* **Detailed View**: Displays key patient demographics including:  
  * Full Name  
  * Birth Date & Gender  
  * Address & Telecom details  
  * Identifiers (SSN, Driver's License, MRN, etc.)  
* **Immunization History**: One-click fetch to retrieve and display Immunization resources linked to a specific patient.  
* **JSON Inspection**: Built-in tools to view and copy the raw FHIR JSON response for debugging.

## **Usage Guide**

### **Creating a Patient**

1. Navigate to the **Create** tab.  
2. Fill in the First Name, Last Name, Gender, and Birth Date.  
3. Click **Create Resource**.  
4. On success, the new Patient ID will be displayed along with the raw JSON response.

### **Searching & Viewing Data**

1. Navigate to the **Search** tab.  
2. Enter a name or a specific Patient ID.  
3. Click **Search**.  
4. Results will display automatically.  
   * **Identifiers**: Look for the tag icons to see associated IDs (e.g., MRN, SSN).  
   * **Immunizations**: Click the "Immunizations" button on any patient card to fetch their vaccination records.

## **API Endpoint**

This application connects to the public HAPI FHIR Test Server:

* **Base URL**: https://hapi.fhir.org/baseR4  
* **Resources Used**: Patient, Immunization

**Note**: The HAPI FHIR public server is a test environment. **DATA IS PUBLIC AND PERIODICALLY RESET. DO NOT ENTER REAL PERSONAL HEALTH INFORMATION (PHI).**