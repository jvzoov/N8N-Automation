import Vue from 'vue';
import N8nInfoAccordion from '../components/N8nInfoAccordion';
import N8nActionBox from '../components/N8nActionBox';
import N8nActionToggle from '../components/N8nActionToggle';
import N8nAvatar from '../components/N8nAvatar';
import N8nButton from '../components/N8nButton';
import { N8nElButton } from '../components/N8nButton/overrides';
import N8nCallout from '../components/N8nCallout';
import N8nCard from '../components/N8nCard';
import N8nFormBox from '../components/N8nFormBox';
import N8nFormInputs from '../components/N8nFormInputs';
import N8nIcon from '../components/N8nIcon';
import N8nIconButton from '../components/N8nIconButton';
import N8nInfoTip from '../components/N8nInfoTip';
import N8nInput from '../components/N8nInput';
import N8nInputLabel from '../components/N8nInputLabel';
import N8nInputNumber from '../components/N8nInputNumber';
import N8nLoading from '../components/N8nLoading';
import N8nHeading from '../components/N8nHeading';
import N8nLink from '../components/N8nLink';
import N8nMarkdown from '../components/N8nMarkdown';
import N8nMenu from '../components/N8nMenu';
import N8nMenuItem from '../components/N8nMenuItem';
import N8nNodeIcon from '../components/N8nNodeIcon';
import N8nNotice from '../components/N8nNotice';
import N8nOption from '../components/N8nOption';
import N8nPulse from '../components/N8nPulse';
import N8nSelect from '../components/N8nSelect';
import N8nSpinner from '../components/N8nSpinner';
import N8nSticky from '../components/N8nSticky';
import N8nRadioButtons from '../components/N8nRadioButtons';
import N8nSquareButton from '../components/N8nInput';
import N8nTags from '../components/N8nTags';
import N8nTabs from '../components/N8nTabs';
import N8nTag from '../components/N8nTag';
import N8nText from '../components/N8nText';
import N8nTooltip from '../components/N8nTooltip';
import N8nUsersList from '../components/N8nUsersList';
import N8nUserSelect from '../components/N8nUserSelect';

export default {
	install: (app: typeof Vue, options?: any) => {
		app.component('n8n-info-accordion', N8nInfoAccordion);
		app.component('n8n-action-box', N8nActionBox);
		app.component('n8n-action-toggle', N8nActionToggle);
		app.component('n8n-avatar', N8nAvatar);
		app.component('n8n-button', N8nButton);
		app.component('el-button', N8nElButton);
		app.component('n8n-callout', N8nCallout);
		app.component('n8n-card', N8nCard);
		app.component('n8n-form-box', N8nFormBox);
		app.component('n8n-form-inputs', N8nFormInputs);
		app.component('n8n-icon', N8nIcon);
		app.component('n8n-icon-button', N8nIconButton);
		app.component('n8n-info-tip', N8nInfoTip);
		app.component('n8n-input', N8nInput);
		app.component('n8n-input-label', N8nInputLabel);
		app.component('n8n-input-number', N8nInputNumber);
		app.component('n8n-loading', N8nLoading);
		app.component('n8n-heading', N8nHeading);
		app.component('n8n-link', N8nLink);
		app.component('n8n-markdown', N8nMarkdown);
		app.component('n8n-menu', N8nMenu);
		app.component('n8n-menu-item', N8nMenuItem);
		app.component('n8n-node-icon', N8nNodeIcon);
		app.component('n8n-notice', N8nNotice);
		app.component('n8n-option', N8nOption);
		app.component('n8n-pulse', N8nPulse);
		app.component('n8n-select', N8nSelect);
		app.component('n8n-spinner', N8nSpinner);
		app.component('n8n-sticky', N8nSticky);
		app.component('n8n-radio-buttons', N8nRadioButtons);
		app.component('n8n-square-button', N8nSquareButton);
		app.component('n8n-tags', N8nTags);
		app.component('n8n-tabs', N8nTabs);
		app.component('n8n-tag', N8nTag);
		app.component('n8n-text', N8nText);
		app.component('n8n-tooltip', N8nTooltip);
		app.component('n8n-users-list', N8nUsersList);
		app.component('n8n-user-select', N8nUserSelect);
	},
};
