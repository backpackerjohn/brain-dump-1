export async function generateEmbedding(content: string, apiKey: string): Promise<number[] | null> {
  try {
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: content
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding API error:', embeddingResponse.status, errorText);
      console.warn('Proceeding without embedding');
      return null;
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;
    console.log('Embedding generated, dimension:', embedding.length);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    console.warn('Proceeding without embedding');
    return null;
  }
}
