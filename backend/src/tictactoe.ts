export type cellName =
  | "11"
  | "12"
  | "13"
  | "21"
  | "22"
  | "23"
  | "31"
  | "32"
  | "33";

export type GameState = {
  player1Moves: cellName[];
  player2Moves: cellName[];
  playerSocketMapping: {
    player1: string;
    player2: string;
  };
};

export const winningCombinations: cellName[][] = [
  // Rows
  ["11", "12", "13"],
  ["21", "22", "23"],
  ["31", "32", "33"],
  // Columns
  ["11", "21", "31"],
  ["12", "22", "32"],
  ["13", "23", "33"],
  // Diagonals
  ["11", "22", "33"],
  ["13", "22", "31"],
];

export function isWinner(moves: cellName[]): boolean {
  return winningCombinations.some((combination) =>
    combination.every((cell) => moves.includes(cell))
  );
}

export enum WINNER_STATE {
  PLAYER1 = 1,
  PLAYER2 = 2,
  CONTINUE = 0,
  DRAW = -1,
}

export function checkWinner(state: GameState): WINNER_STATE {
  const { player1Moves, player2Moves } = state;

  if (isWinner(player1Moves)) {
    return WINNER_STATE.PLAYER1; // Player 1 is the winner
  } else if (isWinner(player2Moves)) {
    return WINNER_STATE.PLAYER2; // Player 2 is the winner
  }

  if (player1Moves.length + player2Moves.length === 9) {
    return WINNER_STATE.DRAW; // It's a draw
  }

  return WINNER_STATE.CONTINUE; // No winner yet
}
