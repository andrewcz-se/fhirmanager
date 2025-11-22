# **FHIR Patient Manager**

A test application that lets you view FHIR resources stored on the HAPI FHIR R4 public test server. This application allows users to create new patients and appointments, search for existing records, and view associated clinical history. I created this application as a shell and precursor to start development on some AI Agent based FHIR work.

## **Features**

* **Create Patients**: specific form to construct and POST a valid FHIR Patient resource to the server.
* **View Appointments**: view patient appointments and related Practitioners for the appointment using FHIR _include functionality to get Practitioner list with appointment retrieval.
* **Create Appointments & Practitioners**: specific form to construct and POST a valid FHIR Appointment resource to the server. An existing Practitioner ID can be used, or if no ID is entered a new Practitioner can be created using the given details.
* **Cancel appointments**: Cancel appointments using the FHIR Appointment Resource. Click [X] next to an Appointment and a Cancellation Reason can be captured and the appointment cancelled.  
* **Search Functionality**:  
  * Search by Name (partial matches supported by the server).  
  * Search by specific Resource ID.  
* **Detailed View**: Displays key patient demographics including:  
  * Full Name  
  * Birth Date & Gender  
  * Address & Telecom details  
  * Identifiers (SSN, Driver's License, MRN, etc.)  
* **Immunization, Procedure, Medication and Allergy History**: One-click fetch to retrieve and display Immunization, Procedure, MedicationRequest and AllergyIntolerance resources linked to a specific patient.  
* **JSON Inspection**: Built-in tools to view and copy the raw FHIR JSON response for debugging.

## **Usage Guide**

### **Creating a Patient**

1. Navigate to the **Create** tab.  
2. Fill in the First Name, Last Name, Gender, and Birth Date.  
3. Click **Create Resource**.  
4. On success, the new Patient ID will be displayed along with the raw JSON response.

### **Creating an Appointment**

1. Navigate to the **Create** tab and click on **Appointment** 
2. Fill in the Patient ID.  
3. Either fill in an existing Practitioner ID, or complete the registration details to create a new Practitioner and associate it to the appointment.
4. On success, the new Appointment and Practitioner ID will be displayed along with the raw JSON response.
5. If the Patient and Practitioner IDs are provided, but do not exist, the Appointment and Practitioner will not be created and an error will be returned.

### **Searching & Viewing Data**

1. Navigate to the **Search** tab.  
2. Enter a name or a specific Patient ID.  
3. Click **Search**.  
4. Results will display automatically.  
   * **Identifiers**: Look for the tag icons to see associated IDs (e.g., MRN, SSN).  
   * **Immunizations**: Click the "Immunizations" button on any patient card to fetch their vaccination records.
   * **Appointments**: Click the "Appointments" button on any patient card to fetch their appointment records. Click X to cancel an appointment.
   * **Procedures**: Click the "Procedures" button on any patient card to fetch their procedure records.          
   * **Allergies**: Click the "Allergies" button on any patient card to fetch their allergy records.
   * **Medications**: Click the "Medications" button on any patient card to fetch their medication records.

## **API Endpoint**

This application connects to the public HAPI FHIR Test Server:

* **Base URL**: https://hapi.fhir.org/baseR4  
* **Resources Used**: Patient, Immunization, Appointment, Practitioner, AllergyIntolerance, MedicationRequest, Procedure

**Note**: The HAPI FHIR public server is a **test** environment. 

**DATA IS PUBLIC AND PERIODICALLY RESET. DO NOT ENTER REAL PERSONAL HEALTH INFORMATION (PHI).**
