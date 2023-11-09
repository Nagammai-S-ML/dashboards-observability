/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
} from '@elastic/eui';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MetricsExportPanel } from './metrics_export_panel';
import { OSDSavedVisualizationClient } from '../../../services/saved_objects/saved_object_client/osd_saved_objects/saved_visualization';
import { getSavedObjectsClient } from '../../../services/saved_objects/saved_object_client/client_factory';
import {
  addMultipleVizToPanels,
  isUuid,
} from '../../custom_panels/redux/panel_slice';
import { MetricType } from '../../../../common/types/metrics';
import {
  dateSpanFilterSelector,
  selectedMetricsIdsSelector,
  selectedMetricsSelector,
} from '../redux/slices/metrics_slice';
import { coreRefs } from '../../../framework/core_refs';
import { selectPanelList } from '../../../../public/components/custom_panels/redux/panel_slice';
import { SavedVisualization } from '../../../../common/types/explorer';
import { visualizationFromMetric } from '../helpers/utils';
import { updateCatalogVisualizationQuery } from '../../custom_panels/helpers/utils';
import { PROMQL_METRIC_SUBTYPE } from '../../../../common/constants/shared';
import { max } from 'lodash';
import { SavedObjectLoader } from '../../../../../../src/plugins/saved_objects/public';
import semver from 'semver';

const Savebutton = ({
  setIsPanelOpen,
}: {
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <EuiButton
      iconSide="right"
      onClick={() => {
        setIsPanelOpen((staleState) => !staleState);
      }}
      data-test-subj="metrics__saveManagementPopover"
      iconType="arrowDown"
    >
      Save
    </EuiButton>
  );
};

const MetricsExportPopOver = () => {
  const availableObservabilityDashboards = useSelector(selectPanelList);
  const [availableDashboards, setAvailableDashboards] = React.useState([]);
  const [osdCoreDashboards, setOsdCoreDashboards] = React.useState([]);

  const [isPanelOpen, setIsPanelOpen] = React.useState(false);

  const selectedMetrics = useSelector(selectedMetricsSelector);
  const selectedMetricsIds = useSelector(selectedMetricsIdsSelector);

  const dateSpanFilter = useSelector(dateSpanFilterSelector);
  const [metricsToExport, setMetricsToExport] = React.useState<MetricType[]>([]);

  const [selectedPanelOptions, setSelectedPanelOptions] = React.useState<any[]>([]);

  const { toasts } = coreRefs;

  const getCoreDashboards = async () => {
    if (!coreRefs.dashboard) return [];

    const dashboardsLoader = coreRefs.dashboard.getSavedDashboardLoader();

    const client = dashboardsLoader.savedObjectsClient;
    const ds = await client.find({ type: 'dashboard' });

    return ds?.savedObjects.map((so) => ({
      ...so,
      objectId: so.type + ':' + so.id,
      title: so.attributes?.title,
      panelConfig: JSON.parse(so.attributes?.panelsJSON || '[]'),
    }));
  };

  useEffect(() => {
    (async function () {
      setOsdCoreDashboards(await getCoreDashboards());
    })();
  }, []);

  useEffect(() => {
    setAvailableDashboards([
      ...osdCoreDashboards,
      ...availableObservabilityDashboards.filter((d) => isUuid(d.id)),
    ]);
  }, [osdCoreDashboards, availableObservabilityDashboards]);

  useEffect(() => {
    if (selectedMetrics && selectedMetricsIds) {
      const metricsArray = selectedMetricsIds.map((id) => selectedMetrics[id]);
      setMetricsToExport(metricsArray);
    }
  }, [selectedMetrics, selectedMetricsIds]);

  const savedObjectInputFromObject = (currentObject: SavedVisualization) => {
    return {
      ...currentObject,
      dateRange: ['now-1d', 'now'],
      fields: [],
      timestamp: 'timestamp',
    };
  };

  const updateSavedVisualization = async (metric: MetricType): string => {
    const client = getSavedObjectsClient({
      objectId: metric.savedVisualizationId,
      objectType: 'savedVisualization',
    });
    const res = await client.get({ objectId: metric.savedVisualizationId });
    const currentObject = res.observabilityObjectList[0];
    const updateParams = {
      objectId: metric.savedVisualizationId,
      ...savedObjectInputFromObject(currentObject.savedVisualization),
      name: metric.name,
    };
    const savedObject = await client.update(updateParams);
    return savedObject;
  };

  const datasourceMetaFrom = (catalog) =>
    JSON.stringify([
      { name: catalog, title: catalog, id: catalog, label: catalog, type: 'prometheus' },
    ]);

  const createSavedVisualization = async (metric): Promise<any> => {
    const [ds, index] = metric.index.split('.');
    const queryMetaData = {
      catalogSourceName: ds,
      catalogTableName: index,
      aggregation: metric.aggregation,
      attributesGroupBy: metric.attributesGroupBy,
    };
    const visMetaData = visualizationFromMetric(
      {
        ...metric,
        dataSources: datasourceMetaFrom(metric.catalog),
        query: updateCatalogVisualizationQuery({
          ...queryMetaData,
          ...dateSpanFilter,
        }),
        queryMetaData,
        subType: PROMQL_METRIC_SUBTYPE,
        dateRange: ['now-1d', 'now'],
        fields: ['@value'],
        timestamp: '@timestamp',
      },
      dateSpanFilter.span,
      dateSpanFilter.reoslution
    );

    const savedObject = await OSDSavedVisualizationClient.getInstance().create(visMetaData);
    return savedObject;
  };

  const panelXYorGreaterThanValue = (value, panel) => {
    const sum = panel.gridData.y + panel.gridData.h;
    return sum > value ? sum : value;
  };

  const panelVersionOrGreaterThanValue = (value, panel) => {
    return semver.compare(value, panel.version) < 0 ? panel.version : value;
  };

  const defaultPanelHeight = 12;
  const defaultPanelWidth = 24;
  const panelGutter = 1;

  const pushNewPanelToDashboardForMetricWith = ({
    dashboard,
    referenceCount,
    maxPanelY,
    maxPanelVersion,
    maxPanelIndex,
  }) => (metric, index) => {
    const { type, id } = metric.object;
    const panelIndex = maxPanelIndex + 1 + index;
    const newPanelConfig = {
      gridData: {
        x: 0,
        y: maxPanelY + panelGutter + index * (panelGutter + defaultPanelHeight),
        w: defaultPanelWidth,
        h: defaultPanelHeight,
        i: `${panelIndex}`,
      },
      panelIndex: `${panelIndex}`,
      version: maxPanelVersion,
      panelRefName: `panel_${referenceCount + index}`,
      embeddableConfig: {},
    };

    const newPanel = {
      name: `panel_${referenceCount + index}`,
      type,
      id,
    };
    dashboard.panelConfig.push(newPanelConfig);
    dashboard.references.push(newPanel);
  };
  const addMultipleVizToODSCoreDashbaords = (osdCoreSelectedDashboards, metricsToExport) => {
    const dashboardsLoader: SavedObjectLoader = coreRefs.dashboard!.getSavedDashboardLoader();

    const client = dashboardsLoader.savedObjectsClient;

    Promise.all(
      osdCoreSelectedDashboards.map(async ({ panel: dashboard }, index) => {
        const referenceCount = dashboard.references.length;
        const maxPanelY = dashboard.panelConfig.reduce(panelXYorGreaterThanValue, 0);
        const maxPanelVersion = dashboard.panelConfig.reduce(
          panelVersionOrGreaterThanValue,
          '0.0.0'
        );
        const maxPanelIndex = max(dashboard.panelConfig.map((p) => parseInt(p.panelIndex)));

        metricsToExport.forEach(
          pushNewPanelToDashboardForMetricWith({
            dashboard,
            referenceCount,
            maxPanelY,
            maxPanelVersion,
            maxPanelIndex,
          })
        );

        const panelsJSON = JSON.stringify(dashboard.panelConfig);

        const updateRes = await client.update(
          dashboard.type,
          dashboard.id,
          { ...dashboard.attributes, panelsJSON },
          {
            references: dashboard.references,
          }
        );
      })
    );
  };

  const handleSavingObjects = async () => {
    let savedMetrics = [];

    try {
      savedMetrics = await Promise.all(
        metricsToExport.map(async (metric, index) => {
          if (metric.savedVisualizationId === undefined) {
            console.log('createSavedVisualization', metric);

            return createSavedVisualization(metric);
          } else {
            console.log('updateSavedVisualization', metric);

            return updateSavedVisualization(metric);
          }
        })
      );
    } catch (e) {
      const message = 'Issue in saving metrics';
      console.error(message, e);
      toasts!.addDanger(message);
      return;
    }

    toasts!.add('Saved metrics successfully!');

    if (selectedPanelOptions.length > 0) {
      const osdCoreSelectedDashboards = selectedPanelOptions.filter(
        (panel) => panel.panel?.type === 'dashboard'
      );
      const observabilityDashboards = selectedPanelOptions.filter(
        (panel) => panel.panel?.type !== 'dashboard'
      );

      try {
        if (observabilityDashboards.length > 0) {
          const savedVisualizationIds = savedMetrics.map((p) => p.objectId);
          console.log(savedMetrics);
          await addMultipleVizToPanels(observabilityDashboards, savedVisualizationIds);
        }
        if (osdCoreSelectedDashboards.length > 0)
          await addMultipleVizToODSCoreDashbaords(osdCoreSelectedDashboards, savedMetrics);

        toasts!.add('Saved metrics to Dashboards successfully!');
      } catch (e) {
        const message = 'Issue in saving metrics to panels';
        console.error(message, e);
        toasts!.addDanger('Issue in saving metrics');
      }
    }
  };

  return (
    <EuiPopover
      button={<Savebutton setIsPanelOpen={setIsPanelOpen} />}
      isOpen={isPanelOpen}
      closePopover={() => setIsPanelOpen(false)}
    >
      <MetricsExportPanel
        availableDashboards={availableDashboards ?? []}
        metricsToExport={metricsToExport ?? []}
        setMetricsToExport={setMetricsToExport}
        selectedPanelOptions={selectedPanelOptions}
        setSelectedPanelOptions={setSelectedPanelOptions}
      />
      <EuiPopoverFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={() => setIsPanelOpen(false)}
              data-test-subj="metrics__SaveCancel"
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              onClick={() => {
                handleSavingObjects().then(() => setIsPanelOpen(false));
              }}
              data-test-subj="metrics__SaveConfirm"
            >
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

export const MetricsExport = () => {
  return <MetricsExportPopOver />;
};
