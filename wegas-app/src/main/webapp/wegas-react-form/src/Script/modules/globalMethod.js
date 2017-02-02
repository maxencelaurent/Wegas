import { handleMethodArgs } from './args';
/**
 * hold Global Methods
 */
const IMPACT = {
    getter: {
        'RequestManager.sendCustomEvent': {
            label: 'Send popup',
            arguments: [{
                type: 'string',
                value: 'popupEvent',
                view: {
                    type: 'hidden'
                }
            }, {
                type: 'string',
                view: {
                    type: 'html'
                }
            }]
        },
        'Event.fire': {
            label: 'Fire event',
            arguments: [{
                type: 'string',
                required: true,
                view: { label: 'Event name' }
            }]
        },
        'DelayedEvent.delayedFire': {
            label: 'Fire delayed event',
            arguments: [
                {
                    type: 'number',
                    required: true,
                    view: { label: 'Minutes' }
                }, {
                    type: 'number',
                    scriptType: 'string',
                    required: true,
                    view: { label: 'Seconds' }
                }, {
                    type: 'string',
                    required: true,
                    view: { label: 'Event name' }
                }]
        }
    },
    condition: {
        'Event.fired': {
            returns: 'boolean',
            label: 'Event has been fired',
            arguments: [{
                type: 'string',
                view: { label: 'Event name' }
            }]
        }
    }
};
/**
 * create a choice config for a given type.
 * @param {string=} type global method type (getter, condition)
 * @returns {{
        label: string;
        value: string;
        className: string;
    }[]} array of choices
 */
export function genChoices(type = 'getter') {
    const impacts = IMPACT[type];
    return Object.keys(impacts).map(k => ({
        label: impacts[k].label,
        value: k,
        className: impacts[k].className
    }));
}
/**
 * Get a schema for a given method.
 * @param {string} member
 * @param {string} method
 * @returns {{label:string,
            arguments:[],
            className:string=,
            returns:string=}} the schema
 */
export function methodDescriptor(member, method) {
    return IMPACT.condition[`${member}.${method}`] || IMPACT.getter[`${member}.${method}`];
}
/**
 * get argument's form for given method.
 * @param {string} member global member
 * @param {string} method global method.
 * @param {Object[]} args Current arguments' value, AST nodes
 * @param {function(Object[]):void} onChange receive updated arguments. AST nodes
 */
export function handleArgs(member, method, args, onChange) {
    const methodDescr = methodDescriptor(member, method);
    return handleMethodArgs(methodDescr, args, onChange);
}
/**
 * register new global method under given type.
 * @param {string} type Global type (getter, condition)
 * @param {{key:{label:string,
            arguments:[],
            className:string=,
            returns:string=}
        }} methodsObject a key value config. Key is a global method ("member.method")
 * @returns {void}
 */
export function register(type, methodsObject) {
    IMPACT[type] = {
        ...IMPACT[type],
        ...methodsObject
    };
}