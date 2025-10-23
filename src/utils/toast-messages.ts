export const TOAST_MESSAGES = {
  thought: {
    processed: (count: number) => ({
      title: 'Thoughts processed',
      description: `${count} thought(s) added`
    }),
    processError: (message: string) => ({
      title: 'Error processing thought',
      description: message,
      variant: 'destructive' as const
    }),
    archived: {
      title: 'Thought archived',
      description: 'You can restore it from the Archive tab'
    },
    archiveError: (message: string) => ({
      title: 'Error archiving thought',
      description: message,
      variant: 'destructive' as const
    }),
    restored: {
      title: 'Thought restored'
    },
    restoreError: (message: string) => ({
      title: 'Error restoring thought',
      description: message,
      variant: 'destructive' as const
    })
  },
  category: {
    removed: {
      title: 'Category removed'
    },
    removeError: (message: string) => ({
      title: 'Error removing category',
      description: message,
      variant: 'destructive' as const
    }),
    fetchError: (message: string) => ({
      title: 'Error fetching categories',
      description: message,
      variant: 'destructive' as const
    })
  },
  cluster: {
    generated: (count: number) => ({
      title: 'Clusters generated',
      description: `${count} cluster(s) created`
    }),
    generateError: (message: string) => ({
      title: 'Error generating clusters',
      description: message,
      variant: 'destructive' as const
    }),
    fetchError: (message: string) => ({
      title: 'Error fetching clusters',
      description: message,
      variant: 'destructive' as const
    })
  },
  connection: {
    findError: (message: string) => ({
      title: 'Error finding connections',
      description: message,
      variant: 'destructive' as const
    })
  },
  validation: {
    contentRequired: {
      title: 'Content required',
      description: 'Please enter some thoughts before processing',
      variant: 'destructive' as const
    },
    contentTooShort: {
      title: 'Content too short',
      description: 'Please enter at least 3 characters',
      variant: 'destructive' as const
    }
  }
};
