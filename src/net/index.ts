/**
 * Pacote do multiplayer para o servidor do Orvalis (ADR 0016): `npm run build:net` gera `dist-net/orvalis-net.cjs`
 * (CommonJS, sem dependências) a partir daqui. Só código puro: sala, protocolo e as regras do mundo que a sala usa.
 */
export { Room, ROOM_SNAPSHOT_VERSION, type Outgoing, type RoomSnapshot } from './room';
export {
  MAX_PLAYERS, PROTOCOL_VERSION, ROOMS, roomById, parseClientMessage, sanitizeName,
  type ClientMessage, type ServerMessage,
} from './protocol';

/** Salas do Titã (ADR 0104): motor voxel próprio, protocolo paralelo ao do mundo principal. */
export { TitanRoom, TITAN_SNAPSHOT_VERSION, type TitanOutgoing, type TitanRoomSnapshot } from './titan/room';
export { TITAN_MAX_PLAYERS, TITAN_PROTOCOL_VERSION, TITAN_ROOMS, titanRoomById, parseTitanClientMessage, type TitanClientMessage, type TitanServerMessage } from './titan/protocol';
