import { generateTestData } from "./helpers/generateTestData";
import { StorageSingleton } from "./services/storage-singlton";
import { processBatch } from "./services/storage/utils/batchProcessor";

export async function initializeStorage(): Promise<void> {
  try {
    console.log("Начинаем инициализацию хранилища...");

    const DATA_SIZE = parseInt(process.env.DATA_SIZE || "1000000");
    console.log(`Количество элементов: ${DATA_SIZE.toLocaleString()}`);

    const GC_PAUSE_EVERY = parseInt(process.env.GC_PAUSE_EVERY || "500000");
    const GC_PAUSE_MS = parseInt(process.env.GC_PAUSE_MS || "10");

    // Получаем или создаем экземпляр
    const storageService = await StorageSingleton.getInstanceAsync();

    const BATCH_SIZE = 100000;

    // 2. Загружаем данные в хранилище
    console.log("Генерация Загрузка данных в хранилище...");
    console.time("loadDataIntoStorage");

    for (let startId = 0; startId < DATA_SIZE; startId += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, DATA_SIZE);
      const batchData = await generateTestData(batchSize, startId + 1);

      console.log(
        `Сгенерировано ${BATCH_SIZE} тестовых элементов с ID от ${startId} до ${startId + BATCH_SIZE}`,
      );

      for (const element of batchData) {
        storageService.addElement(element);
      }

      const processedUpTo = startId + batchSize - 1;
      // Прогресс
      if (processedUpTo > 0 && processedUpTo % GC_PAUSE_EVERY === 0) {
        await new Promise((resolve) => setTimeout(resolve, GC_PAUSE_MS));
      }
    }

    console.timeEnd("loadDataIntoStorage");
    console.log(`Элементы инициализированы и загружены`);

    // 3. Инициализируем поисковый индекс
    console.time("initializeIndex");
    await storageService.initialize();
    console.timeEnd("initializeIndex");

    console.log("Хранилище успешно инициализировано!");
  } catch (error) {
    console.error("Ошибка инициализации хранилища:", error);
    throw error;
  }
}
