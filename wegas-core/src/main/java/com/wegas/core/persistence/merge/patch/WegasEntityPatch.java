/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.persistence.merge.patch;

import com.wegas.core.persistence.merge.annotations.WegasEntityProperty;
import com.wegas.core.exception.client.WegasErrorMessage;
import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.merge.annotations.WegasEntity;
import com.wegas.core.persistence.merge.utils.EmptyCallback;
import com.wegas.core.persistence.merge.utils.WegasCallback;
import java.beans.PropertyDescriptor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;

/**
 *
 * @author maxence
 */
public final class WegasEntityPatch extends WegasPatch {

    /**
     * Changes to apply
     */
    private List<WegasPatch> patches;

    private AbstractEntity entity;

    private List<WegasCallback> entityCallbacks;

    public WegasEntityPatch(AbstractEntity from, AbstractEntity to, Boolean recursive) {
        this(null, 0, PatchMode.OVERRIDE, null, null, null, from, to, recursive);
    }

    /**
     * Compute diff between two entities
     *
     * @param identifier
     * @param order
     * @param mode
     * @param userCallback
     * @param getter
     * @param setter
     * @param from
     * @param to
     * @param recursive
     *
     */
    WegasEntityPatch(Object identifier, int order, PatchMode mode,
            WegasCallback userCallback, Method getter, Method setter,
            AbstractEntity from, AbstractEntity to, Boolean recursive) {
        if ((from == null && to == null) // both entity are null
                || (from != null && to != null && !from.getClass().equals(to.getClass()))) {
            throw WegasErrorMessage.error("imcompatible entities");
        }

        if (recursive == null) {
            recursive = false;
        }

        try {
            this.order = order;
            this.getter = getter;
            this.setter = setter;
            this.fieldCallback = userCallback;

            this.entity = to;

            this.patches = new ArrayList<>();

            this.identifier = identifier;

            Class klass = (from != null) ? from.getClass() : to.getClass();
            Map<Field, WegasEntityProperty> fields = new HashMap<>();

            this.entityCallbacks = new ArrayList<>();

            while (klass != null) {

                for (Field f : klass.getDeclaredFields()) {
                    WegasEntityProperty wegasProperty = f.getDeclaredAnnotation(WegasEntityProperty.class);

                    /*
                     *  Only cares about annotated fields and exclude nonDefaultFields if the patch is not recursive
                     */
                    if (wegasProperty != null && (wegasProperty.includeByDefault() || recursive)) {
                        fields.put(f, wegasProperty);
                    }
                }

                WegasEntity wegasEntity = (WegasEntity) klass.getAnnotation(WegasEntity.class);
                if (wegasEntity != null) {
                    Class<? extends WegasCallback> entityCallbackClass = wegasEntity.callback();

                    if (entityCallbackClass != null && !entityCallbackClass.equals(EmptyCallback.class)) {
                        this.entityCallbacks.add(entityCallbackClass.newInstance());
                    }
                }
                klass = klass.getSuperclass();
            }

            if (from == null) {
                this.setMode(PatchMode.CREATE);
            } else if (to == null) {
                this.setMode(PatchMode.DELETE);
            } else {
                this.setMode(mode);

                for (Entry<Field, WegasEntityProperty> entry : fields.entrySet()) {
                    Field field = entry.getKey();
                    WegasEntityProperty wegasProperty = entry.getValue();

                    String fieldName = field.getName();
                    Class fieldClass = field.getType();

                    int idx = wegasProperty.order();

                    boolean ignoreNull = wegasProperty.ignoreNull();

                    Class<? extends WegasCallback> userFieldCallbackClass = wegasProperty.callback();

                    WegasCallback userFieldCallback = null;
                    if (userFieldCallbackClass != null && !userFieldCallbackClass.equals(EmptyCallback.class)) {
                        userFieldCallback = userFieldCallbackClass.newInstance();
                    }

                    PropertyDescriptor property = new PropertyDescriptor(fieldName, field.getDeclaringClass());

                    Method fGetter = property.getReadMethod();

                    Method fSetter = property.getWriteMethod();

                    Object fromValue = fGetter.invoke(from);
                    Object toValue = fGetter.invoke(to);

                    if (!ignoreNull || toValue == null) {

                        // Which case ?
                        if (wegasProperty.propertyType().equals(WegasEntityProperty.PropertyType.CHILDREN)
                                && (List.class.isAssignableFrom(fieldClass))) {
                            /*
                             * current property a list of abstract entities
                             */
                            patches.add(new WegasChildrenPatch(fieldName, idx, mode,
                                    userFieldCallback,
                                    fGetter, fSetter,
                                    (List<AbstractEntity>) fromValue,
                                    (List<AbstractEntity>) toValue,
                                    recursive, ignoreNull));
                            // ListUtils.mergeList
                        } else if (AbstractEntity.class.isAssignableFrom(fieldClass)) {
                            /*
                            * the property is an abstract entity -> register patch
                             */
                            patches.add(new WegasEntityPatch(fieldName, idx, mode,
                                    userFieldCallback,
                                    fGetter, fSetter,
                                    (AbstractEntity) fromValue, (AbstractEntity) toValue, recursive));
                        } else {
                            // fallback -> primitive or primitive related property (eg. Boolean, List<Double>, Map<String, String>, etc)
                            if (!Objects.equals(fromValue, toValue)) {
                                patches.add(new WegasFieldPatch(fieldName, idx,
                                        (mode == PatchMode.OVERRIDE ? PatchMode.OVERRIDE : PatchMode.UPDATE),
                                        userFieldCallback,
                                        fGetter, fSetter, fromValue, toValue));
                            }
                        }

                    }
                }
                Collections.sort(patches, new PatchOrderComparator());
            }

        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    @Override
    public void apply(AbstractEntity target, WegasCallback callback) {
        try {
            if (getter != null) {
                target = (AbstractEntity) getter.invoke(target);
            }

            switch (mode) {
                case CREATE:
                    AbstractEntity clone = entity.clone();
                    for (WegasCallback entityCallback : entityCallbacks) {
                        entityCallback.postPersist(clone, identifier);
                    }
                    if (callback != null) {
                        callback.postPersist(clone, identifier);
                    }
                    break;
                case DELETE:
                    if (callback != null) {
                        callback.preDestroy(target, identifier);
                    }
                    for (WegasCallback entityCallback : entityCallbacks) {
                        entityCallback.preDestroy(target, identifier);
                    }
                    break;
                default:

                    for (WegasCallback entityCallback : entityCallbacks) {
                        entityCallback.preUpdate(target, this.entity, identifier);
                    }

                    for (WegasPatch patch : patches) {
                        patch.apply(target, null);
                    }

                    for (WegasCallback entityCallback : entityCallbacks) {
                        entityCallback.postUpdate(target, this.entity, identifier);
                    }
                    break;
            }
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private static final class PatchOrderComparator implements Comparator<WegasPatch> {

        @Override
        public int compare(WegasPatch o1, WegasPatch o2) {
            return o1.getOrder() - o2.getOrder();
        }
    }
}
