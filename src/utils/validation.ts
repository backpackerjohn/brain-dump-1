export const validateThoughtContent = (content: string): { isValid: boolean; error?: string } => {
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      error: 'Content required'
    };
  }

  if (content.trim().length < 3) {
    return {
      isValid: false,
      error: 'Content too short'
    };
  }

  return { isValid: true };
};
