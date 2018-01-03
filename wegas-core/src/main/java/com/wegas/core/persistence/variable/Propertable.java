/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.persistence.variable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.wegas.core.persistence.ListUtils;
import com.wegas.core.persistence.VariableProperty;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

/**
 *
 * @author maxence
 */
public interface Propertable {

    /**
     * Internal representation. please do not use as this may change at any time.
     * Please set this method protected
     *
     * @return internal properties representation, use with caution
     */
    public List<VariableProperty> getInternalProperties();

    @JsonIgnore
    default public Map<String, String> getModifiableProperties() {
        return ListUtils.mapEntries(getInternalProperties(), new VariableProperty.Extractor());
    }

    /**
     *
     * @return the properties
     */
    @JsonProperty
    default public Map<String, String> getProperties() {
        return Collections.unmodifiableMap(this.getModifiableProperties());
    }

    /**
     * @param properties the properties to set
     */
    @JsonProperty
    default public void setProperties(Map<String, String> properties) {
        this.getInternalProperties().clear();
        for (Entry<String, String> entry : properties.entrySet()) {
            this.getInternalProperties().add(new VariableProperty(entry.getKey(), entry.getValue()));
        }
    }

    /**
     *
     * @param key
     * @param val
     */
    default public void setProperty(String key, String val) {
        Map<String, String> props = this.getModifiableProperties();
        props.put(key, val);
        this.setProperties(props);
    }

    /**
     *
     * @param key
     *
     * @return true is the resourceInstance is active
     */
    default public String getProperty(String key) {
        return this.getProperties().get(key);
    }

    /**
     * get property by key, cast to double
     *
     * @param key
     *
     * @return the value mapped by key, cast to double
     *
     * @throws NumberFormatException if the property is not a number
     */
    default public double getPropertyD(String key) {
        return Double.valueOf(this.getProperty(key));
    }

    default public boolean removeProperty(String key) {
        return this.getInternalProperties().remove(new VariableProperty(key, ""));
    }

    default public boolean hasProperty(String key) {
        return this.getProperties().containsKey(key);
    }

    default public void clearProperties() {
        this.getInternalProperties().clear();
    }
}
