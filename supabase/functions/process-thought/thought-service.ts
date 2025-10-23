export interface ProcessedThought {
  title: string;
  snippet: string;
  categories: string[];
  content: string;
}

export async function callAIForThoughts(content: string, apiKey: string, systemPrompt: string): Promise<ProcessedThought[]> {
  console.log('Sending request to AI gateway...');
  const thoughtsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: systemPrompt
      }, {
        role: 'user',
        content: content
      }],
      response_format: { type: "json_object" }
    }),
  });

  if (!thoughtsResponse.ok) {
    console.error('AI gateway error:', thoughtsResponse.status, await thoughtsResponse.text());
    throw new Error('AI gateway request failed');
  }

  const thoughtsData = await thoughtsResponse.json();
  console.log('AI Response received');

  const aiContent = thoughtsData.choices[0].message.content;
  let parsedResponse;

  try {
    parsedResponse = JSON.parse(aiContent);
    console.log('Parsed Response:', JSON.stringify(parsedResponse, null, 2));
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    throw new Error('Invalid AI response format');
  }

  let thoughts = parsedResponse.thoughts || [];
  console.log(`AI returned ${thoughts.length} thought(s)`);

  // Fallback: if AI returns no thoughts, create a basic one
  if (thoughts.length === 0 && content.trim().length > 0) {
    console.warn('AI returned no thoughts, creating fallback thought');
    thoughts = [{
      title: content.trim().split('\n')[0].substring(0, 100) || 'Untitled Thought',
      snippet: content.trim().substring(0, 200),
      categories: ['Note'],
      content: content.trim()
    }];
  }

  return thoughts;
}

export async function saveThoughtToDatabase(
  supabaseClient: any,
  userId: string,
  thought: ProcessedThought
) {
  console.log('Inserting thought into database...');
  const { data: insertedThought, error: thoughtError } = await supabaseClient
    .from('thoughts')
    .insert({
      user_id: userId,
      content: thought.content,
      title: thought.title,
      snippet: thought.snippet,
      status: 'active'
    })
    .select()
    .single();

  if (thoughtError) {
    console.error('Error inserting thought:', thoughtError);
    throw thoughtError;
  }

  console.log('Thought inserted successfully:', insertedThought.id);
  return insertedThought;
}
