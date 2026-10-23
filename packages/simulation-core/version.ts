import { engineVersion } from "./index";
export class EngineVersionError extends Error {}
export function assertEngineVersion(version: string | undefined) {
  if (version !== engineVersion)
    throw new EngineVersionError(
      "Versão do motor incompatível. Preserve esta execução e crie uma nova simulação com o motor atual.",
    );
}
