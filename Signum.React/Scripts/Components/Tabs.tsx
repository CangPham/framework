﻿import * as React from 'react'
import * as PropTypes from 'prop-types'
import { classes } from '../Globals';
import { ErrorBoundary } from './ErrorBoundary';

interface UncontrolledTabsProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultEventKey?: string | number;
    onToggled?: (eventKey: string | number) => void;
    children?: React.ReactFragment;
}

interface UncontrolledTabsState {
    activeEventKey: string | number | undefined;
}

export class UncontrolledTabs extends React.Component<UncontrolledTabsProps, UncontrolledTabsState> {

    constructor(props: UncontrolledTabsProps) {
        super(props);
        this.state = {
            activeEventKey: props.defaultEventKey != null ? props.defaultEventKey : getFirstEventKey(props.children)
        };
    }

    componentWillReceiveProps(newProps: UncontrolledTabsProps) {
        if (this.state.activeEventKey == undefined) {
            const newEventKey = getFirstEventKey(newProps.children);
            if (newEventKey != null)
                this.setState({ activeEventKey: newEventKey });
        } else {
            var array = (React.Children.toArray(newProps.children) as React.ReactElement<TabProps>[]);

            if (!array.some(a => a.props.eventKey == this.state.activeEventKey)) {
                const newEventKey = getFirstEventKey(newProps.children);
                this.setState({ activeEventKey: newEventKey });
            }
        }
    }


    handleToggle = (eventKey: string | number) => {
        if (this.state.activeEventKey !== eventKey) {
            this.setState({ activeEventKey: eventKey }, () => {
                if (this.props.onToggled)
                    this.props.onToggled(eventKey);
            });
        }
    }

    render() {

        const { children, defaultEventKey } = this.props;

        return (
            <Tabs activeEventKey={this.state.activeEventKey} toggle={this.handleToggle}>
                {children}
            </Tabs>
        );
    }
}



interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    activeEventKey: string | number | undefined;
    toggle: (eventKey: string | number) => void;
}

function getFirstEventKey(children: React.ReactNode) {
    const array = React.Children.toArray(children);

    if (array && array.length)
        return (array[0] as React.ReactElement<TabProps>).props.eventKey;

    return undefined;
}

export class Tabs extends React.Component<TabsProps> {

    render() {

        var { activeEventKey, children, toggle, ...attrs } = this.props;

        var array = (React.Children.toArray(this.props.children) as React.ReactElement<TabProps>[]);

        return (
            <div {...attrs}>
                <ul className="nav nav-tabs">
                    {array.map(t =>
                        <li className="nav-item" key={t.props.eventKey}>
                            <a href="#"
                                className={classes("nav-link", this.props.activeEventKey == t.props.eventKey && "active")}
                                onClick={e => {
                                    e.preventDefault();
                                    this.props.toggle(t.props.eventKey)
                                }}
                            >
                                {t.props.title}
                            </a>
                        </li>
                    )}
                </ul>
                {array.filter(a => a.props.eventKey == this.props.activeEventKey)}
            </div>
        );
    }
}

interface TabProps extends React.HTMLAttributes<any> {
    eventKey: string | number;
    title?: string /*| React.ReactChild*/;
}

export class Tab extends React.Component<TabProps> {

    static contextTypes = {
        activeTabId: PropTypes.any
    };

    render() {
        var { children, eventKey, title, ...rest } = this.props;

        return (
            <div className={classes("tab-pane", this.props.eventKey == this.context.activeTabId)} {...rest}>
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </div>
        );
    }
}
