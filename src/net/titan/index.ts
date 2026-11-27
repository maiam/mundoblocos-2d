/**
 * Pacote do multiplayer para o servidor do Orvalis (ADR 0016, 0104 e 0115): `npm run build:net` gera `dist-net/orvalis-net.cjs`
 * (CommonJS, sem dependências) a partir daqui. Só código puro: a sala do Titã, o protocolo dela e as regras que a sala usa.
 */
export { TitanRoom, TITAN_SNAPSHOT_VERSION, type TitanOutgoing, type TitanRoomSnapshot } from './room';
export { TITAN_MAX_PLAYERS, TITAN_PROTOCOL_VERSION, TITAN_ROOMS, titanRoomById, parseTitanClientMessage, type TitanClientMessage, type TitanServerMessage } from './protocol';
