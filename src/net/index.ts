/**
 * Pacote do multiplayer para o servidor do Orvalis (ADR 0016): `npm run build:net` gera `dist-net/orvalis-net.cjs`
 * (CommonJS, sem dependências) a partir daqui. Só código puro: sala, protocolo e as regras do mundo que a sala usa.
 */
export { Room, type Outgoing } from './room';
export {
  MAX_PLAYERS, PROTOCOL_VERSION, ROOM_CODE_LENGTH, makeRoomCode, normalizeRoomCode, parseClientMessage, sanitizeName,
  type ClientMessage, type ServerMessage,
} from './protocol';
