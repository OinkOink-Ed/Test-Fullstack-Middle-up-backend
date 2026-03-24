import { generateTestDocuments } from "./helpers/generateTestDocuments";
import { StorageSingleton } from "./services/StorageSingleton";

export async function ensureStorageInitialized(): Promise<void> {
  try {
    console.log("Initializing document storage...");

    const TOTAL_DOCUMENTS = parseInt(process.env.TOTAL_DOCUMENTS || "1000000");
    console.log(`Total documents to load: ${TOTAL_DOCUMENTS.toLocaleString()}`);

    const GC_PAUSE_INTERVAL = parseInt(
      process.env.GC_PAUSE_INTERVAL || "500000",
    );
    const GC_PAUSE_DURATION_MS = parseInt(
      process.env.GC_PAUSE_DURATION_MS || "10",
    );

    const storage = await StorageSingleton.getInstanceAsync();

    const BATCH_SIZE = 100000;

    console.log("Loading documents into storage...");
    console.time("loadDocuments");

    for (let offset = 0; offset < TOTAL_DOCUMENTS; offset += BATCH_SIZE) {
      const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_DOCUMENTS - offset);
      const documents = await generateTestDocuments(
        currentBatchSize,
        offset + 1,
      );

      console.log(
        `Generated ${currentBatchSize} documents (IDs ${offset + 1}-${offset + currentBatchSize})`,
      );

      for (const document of documents) {
        storage.addDocument(document);
      }

      const processedCount = offset + currentBatchSize;
      if (processedCount % GC_PAUSE_INTERVAL === 0) {
        console.log(
          `GC pause for ${GC_PAUSE_DURATION_MS}ms after ${processedCount} documents...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, GC_PAUSE_DURATION_MS),
        );
      }
    }

    console.timeEnd("loadDocuments");
    console.log(`${TOTAL_DOCUMENTS.toLocaleString()} documents loaded`);

    console.log("Building search index...");
    console.time("buildIndex");
    await storage.initialize();
    console.timeEnd("buildIndex");

    console.log("Storage successfully initialized!");
  } catch (error) {
    console.error("Storage initialization failed:", error);
    throw error;
  }
}
