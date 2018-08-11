export function getRandomString(): string {
  return Math.random()
    .toString(36)
    .slice(2);
}

export function getRandomInteger(lowerBound: number, upperBound: number): number {
  return lowerBound + Math.floor(Math.random() * (upperBound - lowerBound));
}
