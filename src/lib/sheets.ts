// lib/sheets.ts — Google Sheets API helper
// Reads credentials from env vars, uses OAuth refresh token

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

async function getAccessToken(): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
            grant_type: 'refresh_token',
        }),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Token error: ${data.error}`);
    return data.access_token;
}

async function sheetsGet(range: string) {
    const token = await getAccessToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

async function sheetsAppend(range: string, values: unknown[][]) {
    const token = await getAccessToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
    });
    return res.json();
}

async function sheetsUpdate(range: string, values: unknown[][]) {
    const token = await getAccessToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
    });
    return res.json();
}

// ─── Helpers de datos ────────────────────────────────────────────────────────

export type Cliente = {
    nombre: string;
    telefono: string;
    signo: string;
    bebidaFavorita: string;
    cumpleanos: string;
    visitas: number;
    ultimaVisita: string;
    totalGastado: number;
    puntos: number;
    nivel: 'TOP' | 'MEDIO' | 'BASE';
    fechaRegistro: string;
    fila: number;
};

export type Pedido = {
    id: string;
    nombre: string;
    telefono: string;
    nivel: string;
    productos: string;
    totalEstimado: number;
    estado: 'Enviado' | 'Preparando' | 'Listo' | 'Cancelado';
    tEnviado: string;
    tPreparando: string;
    tListo: string;
    minEspera: number;
    minPreparacion: number;
    minTotal: number;
    notas: string;
    fecha: string;
    fila: number;
};

export type Producto = {
    nombre: string;
    categoria: string;
    precio: number;
};

function rowToCliente(row: string[], fila: number): Cliente {
    return {
        nombre: row[0] || '',
        telefono: row[1] || '',
        signo: row[2] || '',
        bebidaFavorita: row[3] || '',
        cumpleanos: row[4] || '',
        visitas: parseInt(row[5]) || 0,
        ultimaVisita: row[6] || '',
        totalGastado: parseFloat(row[7]) || 0,
        puntos: parseInt(row[8]) || 0,
        nivel: (row[9] as 'TOP' | 'MEDIO' | 'BASE') || 'BASE',
        fechaRegistro: row[10] || '',
        fila,
    };
}

function rowToPedido(row: string[], fila: number): Pedido {
    return {
        id: row[0] || '',
        nombre: row[1] || '',
        telefono: row[2] || '',
        nivel: row[3] || 'BASE',
        productos: row[4] || '',
        totalEstimado: parseFloat(row[5]) || 0,
        estado: (row[6] as Pedido['estado']) || 'Enviado',
        tEnviado: row[7] || '',
        tPreparando: row[8] || '',
        tListo: row[9] || '',
        minEspera: parseFloat(row[10]) || 0,
        minPreparacion: parseFloat(row[11]) || 0,
        minTotal: parseFloat(row[12]) || 0,
        notas: row[13] || '',
        fecha: row[14] || '',
        fila,
    };
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function getClientes(): Promise<Cliente[]> {
    const data = await sheetsGet('Clientes!A2:K');
    const rows = data.values || [];
    return rows
        .map((row: string[], i: number) => rowToCliente(row, i + 2))
        .filter((c: Cliente) => c.telefono && c.nombre);
}

export async function getClienteByTel(telefono: string): Promise<Cliente | null> {
    const clientes = await getClientes();
    const tel = telefono.replace(/\D/g, '').slice(-10);
    return clientes.find(c => c.telefono.replace(/\D/g, '').slice(-10) === tel) || null;
}

export async function crearCliente(data: Omit<Cliente, 'fila'>) {
    return sheetsAppend('Clientes!A:K', [[
        data.nombre, data.telefono, data.signo, data.bebidaFavorita,
        data.cumpleanos, data.visitas, data.ultimaVisita,
        data.totalGastado, data.puntos, data.nivel, data.fechaRegistro,
    ]]);
}

export async function getPedidos(soloActivos = true): Promise<Pedido[]> {
    const data = await sheetsGet('Pedidos!A2:O');
    const rows = data.values || [];
    let pedidos = rows
        .map((row: string[], i: number) => rowToPedido(row, i + 2))
        .filter((p: Pedido) => p.id);
    if (soloActivos) {
        pedidos = pedidos.filter((p: Pedido) => p.estado === 'Enviado' || p.estado === 'Preparando');
    }
    // Ordenar: TOP primero, luego MEDIO, luego BASE, y dentro de cada nivel por tiempo
    const nivelOrden: Record<string, number> = { TOP: 0, MEDIO: 1, BASE: 2 };
    pedidos.sort((a: Pedido, b: Pedido) => {
        const na = nivelOrden[a.nivel] ?? 2;
        const nb = nivelOrden[b.nivel] ?? 2;
        if (na !== nb) return na - nb;
        return a.tEnviado.localeCompare(b.tEnviado);
    });
    return pedidos;
}

export async function crearPedido(data: Omit<Pedido, 'fila'>) {
    const now = new Date().toISOString();
    return sheetsAppend('Pedidos!A:O', [[
        data.id, data.nombre, data.telefono, data.nivel,
        data.productos, data.totalEstimado, 'Enviado',
        now, '', '', '', '', '', data.notas, data.fecha,
    ]]);
}

export async function actualizarEstadoPedido(fila: number, estado: 'Preparando' | 'Listo') {
    const now = new Date().toISOString();
    if (estado === 'Preparando') {
        await sheetsUpdate(`Pedidos!G${fila}:I${fila}`, [['Preparando', '', now]]);
    } else {
        // Calcular tiempos
        const data = await sheetsGet(`Pedidos!A${fila}:O${fila}`);
        const row = data.values?.[0] || [];
        const tEnviado = new Date(row[7]);
        const tPreparando = new Date(row[8]);
        const tListo = new Date(now);
        const minEspera = ((tPreparando.getTime() - tEnviado.getTime()) / 60000).toFixed(1);
        const minPrep = ((tListo.getTime() - tPreparando.getTime()) / 60000).toFixed(1);
        const minTotal = ((tListo.getTime() - tEnviado.getTime()) / 60000).toFixed(1);
        await sheetsUpdate(`Pedidos!G${fila}:M${fila}`, [[
            'Listo', row[7], row[8], now, minEspera, minPrep, minTotal,
        ]]);
    }
}

export async function getMenu(): Promise<Producto[]> {
    const data = await sheetsGet('Menu!A2:C');
    const rows = data.values || [];
    return rows
        .filter((r: string[]) => r[0] && r[1])
        .map((r: string[]) => ({
            nombre: r[0],
            categoria: r[1],
            precio: parseFloat(r[2]) || 0,
        }));
}
