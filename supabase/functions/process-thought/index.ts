import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Process Thought Function Started ===');
    console.log('Timestamp:', new Date().toISOString());

    const { content } = await req.json();
    
    // Input validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.error('Invalid input: content is empty or not a string');
      return new Response(
        JSON.stringify({ error: 'Content is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing content (first 100 chars):', content.substring(0, 100) + '...');
    
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User authentication failed');
      throw new Error('User not authenticated');
    }
    
    console.log('User authenticated:', user.id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Split content into multiple thoughts if needed
    console.log('Sending request to AI gateway...');
    const thoughtsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'system',
          content: `You are an ADHD-focused thought processing assistant. Split the input into separate thoughts if there are multiple distinct ideas. For each thought, extract:
1. A concise title (first meaningful sentence)
2. A brief snippet (key points, max 2-3 lines)
3. 1-3 relevant category tags - create appropriate category names based on the content (e.g., Work, Personal, Finance, Health, Travel, Shopping, Study, Family, etc.)

IMPORTANT: 
- You must return a JSON object with a "thoughts" array
- Create intuitive, single-word or two-word category names that fit the thought
- Use categories that make sense for organizing and finding thoughts later
- Categories should be capitalized (e.g., "Work", "Personal", "Health")

Example format:
{
  "thoughts": [
    {
      "title": "Buy groceries",
      "snippet": "Need milk, eggs, bread",
      "categories": ["Shopping", "Personal"],
      "content": "Remember to buy groceries: milk, eggs, and bread"
    },
    {
      "title": "Finalize Q4 marketing budget",
      "snippet": "Complete presentation for quarterly review",
      "categories": ["Work", "Finance"],
      "content": "Finalize the Q4 marketing budget presentation"
    }
  ]
}

If the input contains multiple distinct ideas, create separate thought objects. If it's a single thought, return an array with one object.`
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
    console.log('AI Response received:', JSON.stringify(thoughtsData, null, 2));
    
    const aiContent = thoughtsData.choices[0].message.content;
    console.log('AI Content:', aiContent);
    
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

    // Generate embeddings for each thought
    console.log(`Generating embeddings for ${thoughts.length} thought(s)...`);
    const processedThoughts = [];
    for (const thought of thoughts) {
      console.log('Processing thought:', thought.title);
      
      let embedding = null;
      
      try {
        const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: thought.content
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error('Embedding API error:', embeddingResponse.status, errorText);
          console.warn('Proceeding without embedding for this thought');
        } else {
          const embeddingData = await embeddingResponse.json();
          embedding = embeddingData.data[0].embedding;
          console.log('Embedding generated, dimension:', embedding.length);
        }
      } catch (embeddingError) {
        console.error('Error generating embedding:', embeddingError);
        console.warn('Proceeding without embedding for this thought');
      }

      // Insert thought
      console.log('Inserting thought into database...');
      const { data: insertedThought, error: thoughtError } = await supabase
        .from('thoughts')
        .insert({
          user_id: user.id,
          content: thought.content,
          title: thought.title,
          snippet: thought.snippet,
          embedding: embedding,
          status: 'active'
        })
        .select()
        .single();

      if (thoughtError) {
        console.error('Error inserting thought:', thoughtError);
        throw thoughtError;
      }
      
      console.log('Thought inserted successfully:', insertedThought.id);

      // Insert categories
      console.log('Processing categories:', thought.categories);
      for (const categoryName of thought.categories) {
        // Get or create category
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', categoryName)
          .single();

        let categoryId;
        if (existingCategory) {
          console.log('Using existing category:', categoryName);
          categoryId = existingCategory.id;
        } else {
          console.log('Creating new category:', categoryName);
          const { data: newCategory, error: catError } = await supabase
            .from('categories')
            .insert({ user_id: user.id, name: categoryName })
            .select('id')
            .single();
          
          if (catError) {
            console.error('Error creating category:', catError);
            throw catError;
          }
          categoryId = newCategory.id;
        }

        // Link thought to category
        console.log('Linking thought to category...');
        const { error: linkError } = await supabase
          .from('thought_categories')
          .insert({
            thought_id: insertedThought.id,
            category_id: categoryId
          });
        
        if (linkError) {
          console.error('Error linking thought to category:', linkError);
          throw linkError;
        }
      }

      processedThoughts.push({
        ...insertedThought,
        categories: thought.categories
      });
    }

    console.log(`=== Successfully processed ${processedThoughts.length} thought(s) ===`);
    
    return new Response(
      JSON.stringify({ thoughts: processedThoughts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('=== Error Processing Thought ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('authenticated') ? 401 : 
                       errorMessage.includes('authorization') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});