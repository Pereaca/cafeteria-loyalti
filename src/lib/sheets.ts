// lib/sheets.ts — Google Sheets API helper
// Reads credentials from env vars, uses OAuth refresh token

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

// ── Token cache (evita llamar a Google OAuth en cada request) ────────────────
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
    const now = Date.now();
    if (_cachedToken && now < _tokenExpiry) return _cachedToken;
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
    _cachedToken = data.access_token;
    _tokenExpiry = now + 55 * 60 * 1000; // cache por 55 minutos
    return _cachedToken!;
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
        .filter((c: Cliente) => {
            // Excluir filas vacías, headers y notas del sheet
            if (!c.telefono || !c.nombre) return false;
            if (c.telefono === 'Telefono') return false;
            if (c.nombre.startsWith('Se actualiza') || c.nombre.startsWith('NOTA') || c.nombre.startsWith('Sin datos')) return false;
            // Teléfono debe ser numérico de al menos 7 dígitos
            return c.telefono.replace(/\D/g, '').length >= 7;
        });
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

export async function actualizarEstadoPedido(fila: number, estado: 'Preparando' | 'Listo', fechaLocal?: string): Promise<{ nombre?: string; telefono?: string; nivel?: string; productos?: string } | null> {
    const now = new Date().toISOString();
    if (estado === 'Preparando') {
        // Solo actualizar Estado (G) y T.Preparando (I) — NO tocar T.Enviado (H)
        await sheetsUpdate(`Pedidos!G${fila}`, [['Preparando']]);
        await sheetsUpdate(`Pedidos!I${fila}`, [[now]]);
        return null;
    } else {
        // Leer fila completa para calcular tiempos
        const data = await sheetsGet(`Pedidos!A${fila}:O${fila}`);
        const row = data.values?.[0] || [];
        const tEnviado = new Date(row[7]);   // col H
        const tPreparando = new Date(row[8]); // col I
        const tListo = new Date(now);

        // Calcular tiempos (0 si no hay T.Preparando — skip directo a Listo)
        const tPreparandoMs = tPreparando.getTime();
        const tEnviadoMs = tEnviado.getTime();
        const tListoMs = tListo.getTime();
        const minEspera = tPreparandoMs > 0 && !isNaN(tPreparandoMs) && !isNaN(tEnviadoMs)
            ? ((tPreparandoMs - tEnviadoMs) / 60000).toFixed(1) : '0';
        const minPrep = tPreparandoMs > 0 && !isNaN(tPreparandoMs)
            ? ((tListoMs - tPreparandoMs) / 60000).toFixed(1) : '0';
        const minTotal = !isNaN(tEnviadoMs)
            ? ((tListoMs - tEnviadoMs) / 60000).toFixed(1) : '0';

        await sheetsUpdate(`Pedidos!G${fila}:M${fila}`, [[
            'Listo', row[7], row[8], now, minEspera, minPrep, minTotal,
        ]]);

        // ── Escribir en Registros para que Flujo 10 actualice Clientes ──
        // Usar fecha del cliente (timezone correcto); fallback al servidor
        const fecha = fechaLocal || new Date().toLocaleDateString('es-MX');
        const nombre = row[1] || '';
        const telefono = row[2] || '';
        const nivel = row[3] || 'BASE';
        const productos = row[4] || '';
        const total = row[5] || '0';
        await sheetsAppend('Registros!A:I', [[
            fecha, nombre, telefono, nivel, productos, total, '', '', '',
        ]]);

        // Devolver datos del pedido para que la ruta PATCH pueda llamar al webhook
        return { nombre, telefono, nivel, productos };
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
