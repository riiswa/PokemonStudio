import { getEntityNameTextUsingTextId, getEntityNameText } from './ReadingProjectText';
import { useProjectDataReadonly } from './useProjectData';

export const useAbilityPage = () => {
  const { projectDataValues: abilities, selectedDataIdentifier: dbSymbol, state } = useProjectDataReadonly('abilities', 'ability');
  const ability = abilities[dbSymbol];
  const abilityName = getEntityNameTextUsingTextId(ability, state);

  return {
    ability,
    abilityName,
    cannotDelete: Object.keys(abilities).length <= 1,
  };
};

export const useMovePage = () => {
  const { projectDataValues: moves, selectedDataIdentifier: dbSymbol, state } = useProjectDataReadonly('moves', 'move');
  const move = moves[dbSymbol];
  const moveName = getEntityNameText(move, state);

  return {
    move,
    moveName,
    cannotDelete: Object.keys(moves).length <= 1,
  };
};