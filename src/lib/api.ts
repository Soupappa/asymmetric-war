export async function fetchJsonData<T>(file: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/data/${file}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Error fetching ${file}:`, err);
    return null;
  }
}

export async function saveJsonData(file: string, data: any): Promise<boolean> {
  try {
    const res = await fetch(`/api/data/${file}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error saving ${file}:`, err);
    return false;
  }
}
