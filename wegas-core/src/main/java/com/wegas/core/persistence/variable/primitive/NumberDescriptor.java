/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.persistence.variable.primitive;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.wegas.core.exception.client.WegasOutOfBoundException;
import com.wegas.core.merge.annotations.WegasEntity;
import com.wegas.core.merge.annotations.WegasEntityProperty;
import com.wegas.core.merge.utils.WegasCallback;
import com.wegas.core.persistence.Mergeable;
import com.wegas.core.persistence.game.Player;
import com.wegas.core.persistence.variable.VariableDescriptor;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Transient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Entity
@WegasEntity(callback = NumberDescriptor.ValdateDefaultValue.class)
public class NumberDescriptor extends VariableDescriptor<NumberInstance> {

    private static final long serialVersionUID = 1L;
    private static final Logger logger = LoggerFactory.getLogger(NumberDescriptor.class);
    /**
     *
     */
    @WegasEntityProperty(order = -1) // update bound before the default instance
    private Double minValue;
    /**
     *
     */
    @WegasEntityProperty(order = -1) // update bound before the default instance
    private Double maxValue;

    /**
     *
     */
    @Column(columnDefinition = "integer default 20")
    @WegasEntityProperty
    private Integer historySize;

    /**
     *
     */
    public NumberDescriptor() {
        super();
    }

    /**
     *
     * @param name
     */
    public NumberDescriptor(String name) {
        super(name);
    }

    /**
     *
     * @param name
     * @param defaultInstance
     */
    public NumberDescriptor(String name, NumberInstance defaultInstance) {
        super(name, defaultInstance);
    }

    /**
     *
     * @return the minValue
     */
    public Double getMinValue() {
        return minValue;
    }

    /**
     * @param minValue the minValue to set
     */
    public void setMinValue(Double minValue) {
        this.minValue = minValue;
    }

    /**
     * @return the maxValue
     */
    public Double getMaxValue() {
        return maxValue;
    }

    /**
     * @param maxValue the maxValue to set
     */
    public void setMaxValue(Double maxValue) {
        this.maxValue = maxValue;
    }

    /**
     *
     * @return the max value
     */
    @JsonIgnore
    @Transient
    public double getMaxValueD() {
        return this.maxValue;
    }

    /**
     *
     * @return the minimum value
     */
    @JsonIgnore
    @Transient
    public double getMinValueD() {
        return this.minValue;
    }

    public Integer getHistorySize() {
        return historySize;
    }

    public void setHistorySize(Integer historySize) {
        if (historySize != null && historySize >= 0) {
            this.historySize = historySize;
        } else {
            this.historySize = null;
        }
    }

    // ~~~ Sugar for scripts ~~~
    /**
     *
     * @param p
     * @param value
     */
    public void setValue(Player p, double value) {
        this.getInstance(p).setValue(value);
    }

    /**
     *
     * @param p
     * @param value
     */
    public void setValue(Player p, int value) {
        this.getInstance(p).setValue(value);
    }

    /**
     *
     * @return the defaule value
     */
    @Transient
    public double getDefaultValue() {
        return this.getDefaultInstance().getValue();
    }

    /**
     *
     * @param value
     */
    @Deprecated
    public void setDefaultValue(double value) {
        // only used to explicitely ignore while serializing
    }

    /**
     *
     * @param p
     * @param value
     */
    public void add(Player p, double value) {
        this.getInstance(p).add(value);
    }

    /**
     *
     * @param p
     * @param value
     */
    public void sub(Player p, double value) {
        NumberInstance instance = this.getInstance(p);
        instance.setValue(instance.getValue() - value);
    }

    /**
     *
     * @param p
     * @param value
     */
    public void add(Player p, int value) {
        this.getInstance(p).add(value);
    }

    /**
     *
     * @param p
     *
     * @return value of player p instance
     */
    public double getValue(Player p) {
        return this.getInstance(p).getValue();
    }

    public boolean isValueValid(double value) {
        return !(this.getMaxValue() != null && value > this.getMaxValueD() || (this.getMinValue() != null && value < this.getMinValueD()));
    }

    public static class ValdateDefaultValue implements WegasCallback {

        @Override
        public void postUpdate(Mergeable entity, Object ref, Object identifier) {
            if (entity instanceof NumberDescriptor) {
                NumberDescriptor nd = (NumberDescriptor) entity;
                NumberInstance ni = nd.getDefaultInstance();
                double value = ni.getValue();

                if (!nd.isValueValid(value)) {
                    throw new WegasOutOfBoundException(nd.getMinValue(),
                            nd.getMaxValue(), value, nd.getName(), nd.getLabel());
                }
            }
        }
    }
}
