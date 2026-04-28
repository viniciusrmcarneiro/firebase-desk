export const JS_QUERY_SAMPLE_SOURCE = `const db = admin.firestore();
const snapshot = await db.collection('orders')
  .where('status', '==', 'paid')
  .limit(10)
  .get();
const batch = db.batch();
// batch.update(db.doc('orders/example'), { inspectedAt: admin.firestore.Timestamp.now() });

console.log('Fetched', snapshot.size, 'orders');
yield snapshot.docs[0];
yield snapshot;
return snapshot;`;
