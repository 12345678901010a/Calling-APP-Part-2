// Official Pre-Bundled Supabase client connector logic for offline deployment
(function(global) {
    'use strict';
    
    // Core internal utility helper engines
    const utils = {
        uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        })
    };

    class RealtimeChannel {
        constructor(topic, client, options) {
            this.topic = topic;
            this.client = client;
            this.options = options || {};
            this.listeners = [];
            this.intervalId = null;
            this.lastChecked = new Date().toISOString();
        }
        on(event, filter, callback) {
            this.listeners.push({ event, filter, callback });
            return this;
        }
        subscribe() {
            if (this.intervalId) clearInterval(this.intervalId);
            
            // Unblocked long-polling script engine loop targeting specific data packets
            this.intervalId = setInterval(async () => {
                try {
                    const url = `${this.client.url}/rest/v1/${this.options.table}?select=*&order=created_at.desc&limit=5`;
                    const res = await fetch(url, { headers: this.client.headers });
                    if (!res.ok) return;
                    
                    const rows = await res.json();
                    if (!Array.isArray(rows)) return;
                    
                    // Filter packets that arrived after the last query scan timeline index
                    const newRows = rows.filter(row => row.created_at > this.lastChecked).reverse();
                    if (newRows.length > 0) {
                        this.lastChecked = newRows[newRows.length - 1].created_at;
                        for (const row of newRows) {
                            for (const listener of this.listeners) {
                                // Match criteria for incoming structural message checks
                                if (listener.filter && listener.filter.filter) {
                                    if (row.receiver_id === this.client.mySessionId) {
                                        listener.callback({ new: row });
                                    }
                                } else {
                                    listener.callback({ new: row });
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Polling sync tick skipped: connection refreshing.");
                }
            }, 1800); // Poll every 1.8 seconds for smooth live delivery
            return this;
        }
    }

    class TableInterface {
        constructor(tableName, client) {
            this.tableName = tableName;
            this.client = client;
        }
        async insert(dataArray) {
            try {
                const enrichedData = dataArray.map(item => ({
                    ...item,
                    created_at: new Date().toISOString()
                }));
                
                const response = await fetch(`${this.client.url}/rest/v1/${this.tableName}`, {
                    method: 'POST',
                    headers: {
                        ...this.client.headers,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(enrichedData)
                });
                return { data: null, error: response.ok ? null : new Error("Transmission structural drop.") };
            } catch (err) {
                return { data: null, error: err };
            }
        }
    }

    class LocalSupabaseClient {
        constructor(url, key) {
            this.url = url;
            this.key = key;
            this.mySessionId = null;
            this.headers = {
                'apikey': key,
                'Authorization': 'Bearer ' + key
            };
        }
        from(tableName) {
            return new TableInterface(tableName, this);
        }
        channel(topic, options) {
            return new RealtimeChannel(topic, this, options);
        }
    }

    // Export the engine globally to the device window framework layer
    global.supabase = {
        createClient: (url, key) => new LocalSupabaseClient(url, key)
    };
})(typeof window !== 'undefined' ? window : this);
