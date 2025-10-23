export async function getOrCreateCategory(
  supabaseClient: any,
  userId: string,
  categoryName: string
): Promise<string> {
  const { data: existingCategory } = await supabaseClient
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', categoryName)
    .single();

  if (existingCategory) {
    console.log('Using existing category:', categoryName);
    return existingCategory.id;
  }

  console.log('Creating new category:', categoryName);
  const { data: newCategory, error: catError } = await supabaseClient
    .from('categories')
    .insert({ user_id: userId, name: categoryName })
    .select('id')
    .single();

  if (catError) {
    console.error('Error creating category:', catError);
    throw catError;
  }

  return newCategory.id;
}

export async function linkThoughtToCategory(
  supabaseClient: any,
  thoughtId: string,
  categoryId: string
): Promise<void> {
  console.log('Linking thought to category...');
  const { error: linkError } = await supabaseClient
    .from('thought_categories')
    .insert({
      thought_id: thoughtId,
      category_id: categoryId
    });

  if (linkError) {
    console.error('Error linking thought to category:', linkError);
    throw linkError;
  }
}
