import React, { useState } from 'react';
import styled from 'styled-components';
import { Editor } from '@components/editor';

import { TFunction, useTranslation } from 'react-i18next';
import { Input, InputContainer, InputWithLeftLabelContainer, InputWithTopLabelContainer, Label } from '@components/inputs';
import { ToolTip, ToolTipContainer } from '@components/Tooltip';
import { DarkButton, PrimaryButton } from '@components/buttons';
import { SelectMaplink } from '@components/selects';
import { cleanNaNValue } from '@utils/cleanNaNValue';
import { getLinksFromMapLink, MAP_LINK_CARDINAL_LIST, StudioMapLink, StudioMapLinkCardinal } from '@modelEntities/mapLink';

const OffsetInfo = styled.div`
  ${({ theme }) => theme.fonts.normalSmall};
  color: ${({ theme }) => theme.colors.text400};
  user-select: none;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const getShift = (cardinal: StudioMapLinkCardinal, t: TFunction<('database_maplinks' | 'database_moves')[]>) => {
  if (cardinal === 'north' || cardinal === 'south') return t('database_maplinks:offset_shift_right');

  return t('database_maplinks:offset_downward_shift');
};

const mapsAlreadyAssigned = (mapLink: StudioMapLink) => {
  return MAP_LINK_CARDINAL_LIST.flatMap((cardinal) => getLinksFromMapLink(mapLink, cardinal).map((link) => link.mapId)).concat(mapLink.mapId);
};

type NewLinkEditorProps = {
  mapLink: StudioMapLink;
  cardinal: StudioMapLinkCardinal;
  onClose: () => void;
  onAddLink: (cardinal: StudioMapLinkCardinal, selectedMap: string, offset: number) => void;
};

export const NewLinkEditor = ({ mapLink, cardinal, onClose, onAddLink }: NewLinkEditorProps) => {
  const { t } = useTranslation(['database_maplinks', 'database_moves']);
  const [selectedMap, setSelectedMap] = useState<string>('__undef__');
  const [offset, setOffset] = useState<number>(0);

  return (
    <Editor type="creation" title={t('database_maplinks:maplinks')}>
      <InputContainer size="l">
        <InputContainer size="s">
          <InputWithTopLabelContainer>
            <Label htmlFor="map" required>
              {t('database_maplinks:map_located', { cardinal: t(`database_maplinks:${cardinal}`) })}
            </Label>
            <SelectMaplink
              mapId={selectedMap}
              onChange={(selected) => setSelectedMap(selected.value)}
              noneValue
              noneValueIsError
              excludeMaps={mapsAlreadyAssigned(mapLink)}
            />
          </InputWithTopLabelContainer>
          <InputWithTopLabelContainer>
            <InputWithLeftLabelContainer>
              <Label htmlFor="offset">{t('database_maplinks:offset')}</Label>
              <Input
                type="number"
                name="offset"
                min="-999"
                max="999"
                value={isNaN(offset) ? '' : offset}
                onChange={(event) => {
                  const newValue = parseInt(event.target.value);
                  if (newValue < -999 || newValue > 999) return event.preventDefault();
                  setOffset(newValue);
                }}
                onBlur={() => setOffset(cleanNaNValue(offset))}
              />
            </InputWithLeftLabelContainer>
            <OffsetInfo>{t('database_maplinks:offset_info', { shift: getShift(cardinal, t) })}</OffsetInfo>
          </InputWithTopLabelContainer>
        </InputContainer>
        <ButtonContainer>
          <ToolTipContainer>
            {selectedMap === '__undef__' && <ToolTip bottom="100%">{t('database_moves:fields_asterisk_required')}</ToolTip>}
            <PrimaryButton onClick={() => onAddLink(cardinal, selectedMap, offset)} disabled={selectedMap === '__undef__'}>
              {t('database_maplinks:add_link')}
            </PrimaryButton>
          </ToolTipContainer>
          <DarkButton onClick={onClose}>{t('database_moves:cancel')}</DarkButton>
        </ButtonContainer>
      </InputContainer>
    </Editor>
  );
};
