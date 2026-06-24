const encoded = Buffer.from(JSON.stringify([{id: 1, name: "Test"}])).toString('base64');
console.log("===SYSTEM_METADATA_START===" + encoded + "===SYSTEM_METADATA_END===");
