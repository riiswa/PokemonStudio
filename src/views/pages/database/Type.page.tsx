import React, { useEffect } from 'react';
import { DataBlockWithActionTooltip, DataBlockWrapper } from '@components/database/dataBlocks';
import { TypeControlBar } from '@components/database/type/TypeControlBar';
import { TypeFrame } from '@components/database/type/TypeFrame';
import { useNavigate } from 'react-router-dom';
import { DatabasePageStyle } from '@components/database/DatabasePageStyle';
import { PageContainerStyle, PageDataConstrainerStyle } from './PageContainerStyle';
import { TypeEfficiencyData } from '@components/database/type/TypeEfficiencyData';
import { TypeResistanceData } from '@components/database/type/TypeResistanceData';
import { DarkButton, DeleteButtonWithIcon } from '@components/buttons';
import { useTranslation } from 'react-i18next';
import { DataBlockWithTitleNoActive } from '@components/database/dataBlocks/DataBlockWithTitle';
import { useDialogsRef } from '@utils/useDialogsRef';
import { useTypePage } from '@utils/usePage';
import { TypeEditorAndDeletionKeys, TypeEditorOverlay } from '@components/database/type/editors/TypeEditorOverlay';
import { useProjectTypes } from '@utils/useProjectData';

export const TypePage = () => {
  const dialogsRef = useDialogsRef<TypeEditorAndDeletionKeys>();
  const { setProjectDataValues: setType } = useProjectTypes();
  const { currentTypeName, currentType } = useTypePage();
  const { t } = useTranslation('database_types');
  const navigate = useNavigate();
  const canBeDeleted: boolean = currentType.id <= 18;

  useEffect(() => {
    if (!currentType) return;
    setType({ [currentType.dbSymbol]: currentType }, { type: currentType.dbSymbol });
  }, [currentType]);

  return (
    <DatabasePageStyle>
      <TypeControlBar dialogsRef={dialogsRef} />
      <PageContainerStyle>
        <PageDataConstrainerStyle>
          <DataBlockWrapper>
            <TypeFrame dialogsRef={dialogsRef} />
            <TypeEfficiencyData />
            <TypeResistanceData />
          </DataBlockWrapper>
          <DataBlockWrapper>
            <DataBlockWithTitleNoActive size="half" title={t('list_all_pokemon', { type: currentTypeName })} data-noactive>
              <DarkButton onClick={() => navigate(`/database/types/${currentType.dbSymbol}/pokemon`)}>{t('show_all_pokemon')}</DarkButton>
            </DataBlockWithTitleNoActive>
            <DataBlockWithTitleNoActive size="half" title={t('list_all_moves', { type: currentTypeName })} data-noactive>
              <DarkButton onClick={() => navigate(`/database/types/${currentType.dbSymbol}/moves`)}>{t('show_all_moves')}</DarkButton>
            </DataBlockWithTitleNoActive>
            <DataBlockWithActionTooltip
              title={t('deletion')}
              size="full"
              disabled={canBeDeleted}
              tooltipMessage={canBeDeleted ? t('deletion_disabled') : ''}
            >
              <DeleteButtonWithIcon onClick={() => dialogsRef?.current?.openDialog('deletion', true)} disabled={canBeDeleted}>
                {t('delete_this_type')}
              </DeleteButtonWithIcon>
            </DataBlockWithActionTooltip>
          </DataBlockWrapper>
          <TypeEditorOverlay ref={dialogsRef} />
        </PageDataConstrainerStyle>
      </PageContainerStyle>
    </DatabasePageStyle>
  );
};
