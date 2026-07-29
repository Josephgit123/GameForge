export type Role = 'CUSTOMER' | 'PUBLISHER' | 'ADMIN';
export type GameStatus = 'DRAFT' | 'PUBLISHED' | 'DELISTED';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export interface Game {
  id: string;
  publisherId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  status: GameStatus;
}

export interface AuthResponse {
  token: string;
  user: User;
}
