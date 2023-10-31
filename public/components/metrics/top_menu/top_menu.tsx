/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSuperDatePicker,
} from '@elastic/eui';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resolutionOptions } from '../../../../common/constants/metrics';
import { uiSettingsService } from '../../../../common/utils';
import {
  dateSpanFilterSelector,
  updateDateSpan,
  updateStartEndDate,
} from '../redux/slices/metrics_slice';
import { MetricsExport } from './metrics_export';
import './top_menu.scss';

export const TopMenu = () => {
  // Redux tools
  const dispatch = useDispatch();
  const dateSpanFilter = useSelector(dateSpanFilterSelector);

  return (
    <>
      <EuiFlexGroup gutterSize="s" justifyContent={'flexEnd'}>
        <EuiFlexItem grow={false}>
          <div className="resolutionSelect">
            <EuiFieldText
              className="resolutionSelectText"
              prepend="Span Interval"
              value={dateSpanFilter.span}
              isInvalid={dateSpanFilter.span < 1}
              onChange={(e) => dispatch(updateDateSpan({ span: e.target.value }))}
              data-test-subj="metrics__spanValue"
              append={
                <EuiSelect
                  className="resolutionSelectOption"
                  options={resolutionOptions}
                  value={dateSpanFilter.resolution}
                  onChange={(e) => dispatch(updateDateSpan({ resolution: e.target.value }))}
                  aria-label="resolutionSelect"
                  data-test-subj="metrics__spanResolutionSelect"
                />
              }
              aria-label="resolutionField"
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem className="metrics-search-bar-datepicker">
          <EuiSuperDatePicker
            dateFormat={uiSettingsService.get('dateFormat')}
            start={dateSpanFilter.start}
            end={dateSpanFilter.end}
            onTimeChange={(e) => dispatch(updateStartEndDate(e))}
            recentlyUsedRanges={dateSpanFilter.recentlyUsedRanges}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricsExport />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
