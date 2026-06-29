import React, { useEffect } from 'react';
import { useFormikContext } from 'formik';
import type { GroupKey } from './settingsHelpers';

interface Props {
    groupKey:      GroupKey;
    onDirtyChange: (groupKey: GroupKey, isDirty: boolean) => void;
}

const DirtyReporter: React.FC<Props> = ({ groupKey, onDirtyChange }) => {
    const { dirty } = useFormikContext();
    useEffect(() => {
        onDirtyChange(groupKey, dirty);
    }, [dirty, groupKey, onDirtyChange]);
    return null;
};

export default DirtyReporter;
