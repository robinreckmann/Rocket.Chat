import { Pagination, States, StatesAction, StatesActions, StatesIcon, StatesTitle } from '@rocket.chat/fuselage';
import { useMediaQuery, useDebouncedValue, useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { useRouter, useTranslation } from '@rocket.chat/ui-contexts';
import type { ReactElement, MutableRefObject } from 'react';
import React, { useRef, useMemo, useState, useEffect } from 'react';

import FilterByText from '../../../../components/FilterByText';
import GenericNoResults from '../../../../components/GenericNoResults';
import {
	GenericTable,
	GenericTableHeader,
	GenericTableHeaderCell,
	GenericTableBody,
	GenericTableLoadingTable,
} from '../../../../components/GenericTable';
import { usePagination } from '../../../../components/GenericTable/hooks/usePagination';
import { useSort } from '../../../../components/GenericTable/hooks/useSort';
import { useListUsers } from '../hooks/useListUsers';
import InviteUsersTableRow from './InviteUsersTableRow';

type UsersTableProps = {
	reload: MutableRefObject<() => void>;
	onReload: () => void;
	setPendingActionsCount: React.Dispatch<React.SetStateAction<number>>;
};

const UsersTable = ({ reload, onReload, setPendingActionsCount }: UsersTableProps): ReactElement | null => {
	const t = useTranslation();
	const router = useRouter();
	const mediaQuery = useMediaQuery('(min-width: 1024px)');

	const [text, setText] = useState('');

	const { current, itemsPerPage, setItemsPerPage, setCurrent, ...paginationProps } = usePagination();
	const { sortBy, sortDirection, setSort } = useSort<'name' | 'emails.address' | 'status' | 'date'>('name');

	const searchTerm = useDebouncedValue(text, 500);
	const prevSearchTerm = useRef('');

	const { data, isLoading, isSuccess, isError, refetch } = useListUsers(
		searchTerm,
		prevSearchTerm,
		setCurrent,
		sortBy,
		sortDirection,
		itemsPerPage,
		current,
		setPendingActionsCount,
	);

	// TODO: add filter functions
	const filteredUsers = data?.users || [];

	useEffect(() => {
		reload.current = refetch;
		prevSearchTerm.current = searchTerm;
	}, [reload, refetch, searchTerm]);

	const isKeyboardEvent = (
		event: React.MouseEvent<HTMLElement, MouseEvent> | React.KeyboardEvent<HTMLElement>,
	): event is React.KeyboardEvent<HTMLElement> => {
		return (event as React.KeyboardEvent<HTMLElement>).key !== undefined;
	};

	const handleClickOrKeyDown = useMutableCallback(
		(id, e: React.MouseEvent<HTMLElement, MouseEvent> | React.KeyboardEvent<HTMLElement>): void => {
			e.stopPropagation();

			const keyboardSubmitKeys = ['Enter', ' '];

			if (isKeyboardEvent(e) && !keyboardSubmitKeys.includes(e.key)) {
				return;
			}

			router.navigate({
				name: 'admin-users',
				params: {
					context: 'info',
					id,
				},
			});
		},
	);

	const headers = useMemo(
		() => [
			<GenericTableHeaderCell w='x200' key='type' direction={sortDirection} active={sortBy === 'name'} onClick={setSort} sort='name'>
				{t('Invite_type')}
			</GenericTableHeaderCell>,
			<GenericTableHeaderCell
				w='x120'
				key='email'
				direction={sortDirection}
				active={sortBy === 'emails.address'}
				onClick={setSort}
				sort='emails.address'
			>
				{t('Email')}
			</GenericTableHeaderCell>,
			mediaQuery && (
				<GenericTableHeaderCell w='x140' key='date' direction={sortDirection} active={sortBy === 'date'} onClick={setSort} sort='date'>
					{t('Date')}
				</GenericTableHeaderCell>
			),
			mediaQuery && (
				<GenericTableHeaderCell
					w='x100'
					key='status'
					direction={sortDirection}
					active={sortBy === 'status'}
					onClick={setSort}
					sort='status'
				>
					{t('Invite_status')}
				</GenericTableHeaderCell>
			),
			<GenericTableHeaderCell key='actions' w='x176' />,
		],
		[mediaQuery, setSort, sortBy, sortDirection, t],
	);

	return (
		<>
			<FilterByText autoFocus placeholder={t('Search_Users')} onChange={({ text }): void => setText(text)} />

			{isLoading && (
				<GenericTable>
					<GenericTableHeader>{headers}</GenericTableHeader>
					<GenericTableBody>{isLoading && <GenericTableLoadingTable headerCells={5} />}</GenericTableBody>
				</GenericTable>
			)}

			{isError && (
				<States>
					<StatesIcon name='warning' variation='danger' />
					<StatesTitle>{t('Something_went_wrong')}</StatesTitle>
					<StatesActions>
						<StatesAction onClick={() => refetch()}>{t('Reload_page')}</StatesAction>
					</StatesActions>
				</States>
			)}

			{isSuccess && filteredUsers.length === 0 && (
				<GenericNoResults title={t('No_invite_records')} icon='user' description={t('Add_people_by_sending_invites')} />
			)}

			{isSuccess && !!data && !!filteredUsers && (
				<>
					<GenericTable>
						<GenericTableHeader>{headers}</GenericTableHeader>
						<GenericTableBody>
							{filteredUsers.map((user) => (
								<InviteUsersTableRow
									key={user._id}
									onClick={handleClickOrKeyDown}
									mediaQuery={mediaQuery}
									user={user}
									refetchUsers={refetch}
									onReload={onReload}
								/>
							))}
						</GenericTableBody>
					</GenericTable>
					<Pagination
						divider
						current={current}
						itemsPerPage={itemsPerPage}
						count={data?.total || 0}
						onSetItemsPerPage={setItemsPerPage}
						onSetCurrent={setCurrent}
						{...paginationProps}
					/>
				</>
			)}
		</>
	);
};

export default UsersTable;