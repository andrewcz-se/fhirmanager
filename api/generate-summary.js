export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Securely retrieve the API Key from the server environment
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  try {
    const { bundle } = request.body;

    if (!bundle) {
      return response.status(400).json({ error: 'No patient data provided' });
    }

    const prompt = "You are an expert clinician. Review the following FHIR JSON data for a patient. Provide an informative clinical summary suitable for a healthcare provider reading a chart. Make logical inferences about the patient's condition based on the data provided. Focus on conditions, medications, procedures, immunizations and allergies. Do not mention specific IDs. Structure with clear headings using markdown (e.g. ## for section headers, ** for bold).";

    const geminiPayload = {
      contents: [{
        parts: [{ text: prompt + "\n\n" + JSON.stringify(bundle) }]
      }]
    };

    // Call Google Gemini API server-side, gemini-2.5-pro, gemini-2.5-flash-lite
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        throw new Error(`AI Service Error: ${geminiRes.status} - ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const summaryText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.";

    // Return only the summary text to the client
    return response.status(200).json({ summary: summaryText });

  } catch (error) {
    console.error("API Route Error:", error);
    return response.status(500).json({ error: error.message });
  }
}