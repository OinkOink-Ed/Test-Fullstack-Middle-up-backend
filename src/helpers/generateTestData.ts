export async function generateTestData(
  count: number,
  startId: number,
): Promise<any[]> {
  console.time("generateTestData");
  const items = [];

  for (let i = 0; i < count; i++) {
    const id = i + startId;

    items.push({
      id: `${id}`,
      name: `Item ${id}`,
      description: `Description for item ${id}`,
      createdAt: new Date().toISOString(),
      value: Math.random() * 1000,
      category: `category_${Math.floor(Math.random() * 100)}`,
    });
  }

  console.timeEnd("generateTestData");
  return items;
}
