export const DB_NAME = "deep-agents-ui";
export const DB_VERSION = 3;
export const STORE_NAME = "subagent_messages";

/**
 * Delete all subagent messages associated with a specific thread from IndexedDB
 */
export async function deleteThreadData(threadId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("threadId");

        // Find all records with this threadId
        const getRequest = index.getAllKeys(threadId);

        getRequest.onsuccess = () => {
          const keys = getRequest.result;
          if (keys.length === 0) {
            db.close();
            resolve();
            return;
          }

          let deletedCount = 0;
          keys.forEach((key) => {
            const deleteRequest = store.delete(key);
            deleteRequest.onsuccess = () => {
              deletedCount++;
              if (deletedCount === keys.length) {
                db.close();
                resolve();
              }
            };
            deleteRequest.onerror = () => {
              db.close();
              reject(deleteRequest.error);
            };
          });
        };

        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };

        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}
