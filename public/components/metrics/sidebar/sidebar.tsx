/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './sidebar.scss';

import React, { useEffect, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { I18nProvider } from '@osd/i18n/react';
import { batch, useDispatch, useSelector } from 'react-redux';
import {
  availableMetricsSelector,
  loadMetrics,
  selectedMetricsSelector,
  addSelectedMetric,
  removeSelectedMetric,
  selectMetricByIdSelector,
  selectedMetricsIdsSelector,
} from '../redux/slices/metrics_slice';
import { MetricsAccordion } from './metrics_accordion';
import { SearchBar } from './search_bar';
import { selected } from '../../../../../../src/core/server/saved_objects/export/get_sorted_objects_for_export.test';

export const Sidebar = ({
  additionalSelectedMetricId,
}: {
  additionalSelectedMetricId?: string;
}) => {
  const dispatch = useDispatch();

  const availableMetrics = useSelector(availableMetricsSelector);
  const selectedMetrics = useSelector(selectedMetricsSelector);
  const selectedMetricsIds = useSelector(selectedMetricsIdsSelector);

  const additionalMetric = useSelector(selectMetricByIdSelector(additionalSelectedMetricId));

  useEffect(() => {
    batch(() => {
      dispatch(loadMetrics());
    });
  }, [dispatch]);

  useEffect(() => {
    if (additionalMetric) handleAddMetric(additionalMetric);
  }, [additionalMetric]);

  const selectedMetricsList = useMemo(() => {
    return selectedMetricsIds.map((id) => selectedMetrics[id]).filter((m) => m); // filter away null entries
  }, [selectedMetrics, selectedMetricsIds]);

  const handleAddMetric = (metric: any) => dispatch(addSelectedMetric(metric));

  const handleRemoveMetric = (metric: any) => {
    dispatch(removeSelectedMetric(metric));
  };

  return (
    <I18nProvider>
      <section className="sidebarHeight">
        <SearchBar />
        <EuiSpacer size="s" />

        <MetricsAccordion
          metricsList={selectedMetricsList}
          headerName="Selected Metrics"
          handleClick={handleRemoveMetric}
          dataTestSubj="metricsListItems_selectedMetrics"
        />
        <EuiSpacer size="s" />
        <MetricsAccordion
          metricsList={availableMetrics}
          headerName="Available Metrics"
          handleClick={handleAddMetric}
          dataTestSubj="metricsListItems_availableMetrics"
        />
      </section>
    </I18nProvider>
  );
};
