export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  groups: () => ['groups'] as const,
  group: (groupId: string) => ['group', groupId] as const,
  groupOverview: (groupId: string) => ['group-overview', groupId] as const,
  members: (groupId: string) => ['members', groupId] as const,
  categories: (groupId: string) => ['categories', groupId] as const,
  items: (groupId: string) => ['items', groupId] as const,
  item: (itemId: string) => ['item', itemId] as const,
  purchases: (itemId: string) => ['purchases', itemId] as const,
  groupPurchases: (groupId: string) => ['group-purchases', groupId] as const,
};
